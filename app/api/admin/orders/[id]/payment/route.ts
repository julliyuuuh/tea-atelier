import { pool } from "@/lib/db";

export type PaymentResource = {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    livemode: boolean;
    status: string;
    source?: { id: string };
  };
};
export type PaymentOrder = {
  order_id: number;
  user_id: number;
  total_amount: string;
  recipient_name: string | null;
  order_status: string;
  payment_status: string;
  paymongo_source_id: string;
  paymongo_payment_id: string | null;
};
export function matchesPayment(
  payment: PaymentResource | undefined,
  order: PaymentOrder,
): payment is PaymentResource {
  const a = payment?.attributes;
  const key = process.env.PAYMONGO_SECRET_KEY;
  return (
    !!key &&
    !!payment &&
    /^pay_[a-zA-Z0-9]+$/.test(payment.id) &&
    a?.amount === Math.round(Number(order.total_amount) * 100) &&
    a.currency === "PHP" &&
    a.livemode === !key.startsWith("sk_test_") &&
    a.source?.id === order.paymongo_source_id &&
    (!order.paymongo_payment_id || order.paymongo_payment_id === payment.id)
  );
}
export async function fetchPayment(id: string): Promise<PaymentResource> {
  if (!/^pay_[a-zA-Z0-9]+$/.test(id) || !process.env.PAYMONGO_SECRET_KEY)
    throw new Error("Invalid payment configuration or ID");
  const response = await fetch(
    `https://api.paymongo.com/v1/payments/${encodeURIComponent(id)}`,
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  const body = await response.json();
  if (!response.ok || body?.data?.id !== id)
    throw new Error("Payment lookup could not be verified");
  return body.data;
}
// Persist the captured ID independently: if finalization rolls back, a retry
// can GET this payment instead of submitting another money-moving request.
export async function finalizePayment(
  order: PaymentOrder,
  payment: PaymentResource,
) {
  if (!matchesPayment(payment, order) || payment.attributes.status !== "paid")
    throw new Error("Payment does not match order");
  const sourceId = order.paymongo_source_id;
  const saved = await pool.query(
    `UPDATE orders SET paymongo_payment_id = $3
    WHERE order_id = $1 AND paymongo_source_id = $2
      AND (paymongo_payment_id IS NULL OR paymongo_payment_id = $3) RETURNING order_id`,
    [order.order_id, sourceId, payment.id],
  );
  if (!saved.rows.length) throw new Error("Payment attempt changed");
  const client = await pool.connect();
  let itemsForEmail: { name: string; quantity: number; price: number }[] = [];
  let userEmail: string | undefined;
  let fulfillmentOnHold = false;

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");

    const upd = await client.query(
      `UPDATE orders SET payment_status = 'paid', paymongo_payment_id = $3
        WHERE order_id = $1
          AND paymongo_source_id = $2
          AND payment_status IS DISTINCT FROM 'paid'
          AND (paymongo_payment_id IS NULL OR paymongo_payment_id = $3)
        RETURNING user_id, order_status`,
      [order.order_id, sourceId, payment.id],
    );

    // Only runs the first time (guards against duplicate webhook deliveries)
    if (upd.rows.length > 0 && upd.rows[0].order_status !== "CANCELLED") {
      // Serialize allocation across paid orders. A shortage is a visible
      // fulfillment hold, not permission to silently ship an incomplete order.
      await client.query(
        `SELECT p.product_id FROM products p
        JOIN order_items oi ON oi.product_id = p.product_id
        WHERE oi.order_id = $1 ORDER BY p.product_id FOR UPDATE OF p`,
        [order.order_id],
      );
      // Customer already paid, so we can't refuse the order here. But if
      // stock ran out while they were paying, flag it for cancellation/refund
      // instead of silently allowing fulfillment.
      const short = await client.query(
        `SELECT COALESCE(p.product_name, 'Product #' || oi.product_id) AS product_name
             FROM order_items oi
             LEFT JOIN products p ON p.product_id = oi.product_id
             WHERE oi.order_id = $1 AND (p.product_id IS NULL OR p.stock_quantity < oi.quantity)`,
        [order.order_id],
      );
      if (short.rows.length > 0) {
        fulfillmentOnHold = true;
        await client.query(
          `UPDATE orders SET payment_fulfillment_issue = $2 WHERE order_id = $1`,
          [
            order.order_id,
            "Insufficient stock at payment confirmation. Contact the customer and arrange cancellation/refund: " +
              short.rows.map((r) => r.product_name).join(", "),
          ],
        );
      }

      await client.query(
        `UPDATE products p
            SET stock_quantity = GREATEST(p.stock_quantity - oi.quantity, 0)
            FROM order_items oi
            WHERE oi.order_id = $1 AND oi.product_id = p.product_id`,
        [order.order_id],
      );

      const emailRes = await client.query(
        `SELECT u.email, oi.quantity, oi.price, COALESCE(to_jsonb(oi)->>'product_name_snapshot', p.product_name, 'Product #' || oi.product_id) AS product_name
             FROM order_items oi
             LEFT JOIN products p ON p.product_id = oi.product_id
             JOIN users u ON u.user_id = $2
             WHERE oi.order_id = $1`,
        [order.order_id, upd.rows[0].user_id],
      );
      if (emailRes.rows.length > 0) {
        userEmail = emailRes.rows[0].email;
        itemsForEmail = emailRes.rows.map((row) => ({
          name: row.product_name,
          quantity: row.quantity,
          price: parseFloat(row.price),
        }));
      }

      // Remove only cart entries unchanged since this order was created.
      // Edited or re-added products belong to the current cart and stay there.
      await client.query(
        `DELETE FROM cart AS c
            USING order_items AS oi
            WHERE c.user_id = $1
              AND oi.order_id = $2
              AND c.product_id = oi.product_id
              AND c.checkout_revision = oi.cart_checkout_revision`,
        [upd.rows[0].user_id, order.order_id],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    // The customer HAS been charged but the order couldn't be finalized.
    // The saved payment ID permits GET-only reconciliation on a webhook
    // retry or customer status check. No second charge is submitted.
    console.error(`Order ${order.order_id} charged but NOT finalized:`, e);
    throw e;
  } finally {
    client.release();
  }

  // Send the confirmation email after commit, a failure here shouldn't
  // undo the payment confirmation, so just log and move on.
  if (userEmail) {
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/email");
      await sendOrderConfirmationEmail(
        userEmail,
        order.recipient_name || "there",
        order.order_id,
        itemsForEmail,
        parseFloat(order.total_amount),
        fulfillmentOnHold,
      );
    } catch (emailError) {
      console.error(
        `Order ${order.order_id} paid, but confirmation email failed:`,
        emailError,
      );
    }
  }
}
