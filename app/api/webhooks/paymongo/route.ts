// app/api/webhooks/paymongo/route.ts

import { verifyPaymongoSignature } from "@/lib/paymongo";
import { pool } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("paymongo-signature");
  if (!verifyPaymongoSignature(rawBody, signature, process.env.PAYMONGO_WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.data.attributes.type === "source.chargeable") {
    const sourceId = event.data.attributes.data.id;
    const orderRes = await pool.query(
      `SELECT order_id, user_id, payment_status, total_amount, recipient_name
       FROM orders WHERE paymongo_source_id = $1`,
      [sourceId]
    );
    const order = orderRes.rows[0];
    if (!order) return new Response("ok", { status: 200 });

    // Already processed (e.g. a retried webhook delivery), skip re-charging
    if (order.payment_status === "paid") {
      return new Response("ok", { status: 200 });
    }

    // The amount being charged must match what the order actually costs
    const paidCentavos = event.data.attributes.data.attributes.amount;
    if (paidCentavos !== Math.round(parseFloat(order.total_amount) * 100)) {
      console.error(`Amount mismatch on order ${order.order_id}`);
      return new Response("ok", { status: 200 }); // don't charge; investigate manually
    }

    // CLAIM the order before charging. This single UPDATE is atomic, so if two
    // webhook deliveries arrive at the same moment, only one of them gets
    // rowCount = 1 and is allowed to call PayMongo.
    const claim = await pool.query(
      `UPDATE orders SET payment_status = 'processing'
      WHERE order_id = $1
        AND paymongo_source_id = $2
        AND payment_status IN ('pending', 'failed')
      RETURNING order_id`,
      [order.order_id, sourceId]
    );

    if (claim.rowCount === 0) {
      return new Response("ok", { status: 200 });
    }

    let payRes: Response;
    let payment: any;
    try {
      payRes = await fetch("https://api.paymongo.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
        },
        body: JSON.stringify({
          data: { attributes: {
            amount: paidCentavos,
            source: { id: sourceId, type: "source" },
            currency: "PHP",
          }},
        }),
      });
      payment = await payRes.json();
    } catch (error) {
      console.error(
        `Order ${order.order_id}, source ${sourceId}: payment outcome unknown`,
        error
      );

      return new Response("Payment outcome requires verification", {
        status: 500,
      });
    }
    const paymentAttributes = payment?.data?.attributes;
    const verifiedPayment =
      payRes.ok &&
      typeof payment?.data?.id === "string" &&
      paymentAttributes?.amount === paidCentavos &&
      paymentAttributes?.currency === "PHP";

    if (verifiedPayment && paymentAttributes.status === "paid") {
      const client = await pool.connect();
      let itemsForEmail: { name: string; quantity: number; price: number }[] = [];
      let userEmail: string | undefined;

      try {
        await client.query("BEGIN");

      const upd = await client.query(
        `UPDATE orders SET payment_status = 'paid'
        WHERE order_id = $1
          AND paymongo_source_id = $2
          AND payment_status = 'processing'
        RETURNING user_id`,
        [order.order_id, sourceId]
      );

        // Only runs the first time (guards against duplicate webhook deliveries)
        if (upd.rows.length > 0) {
          // Customer already paid, so we can't refuse the order here. But if
          // stock ran out while they were paying, log it so it can be handled
          // (refund / backorder) instead of being silently hidden.
          const short = await client.query(
            `SELECT p.product_name
             FROM order_items oi
             JOIN products p ON p.product_id = oi.product_id
             WHERE oi.order_id = $1 AND p.stock_quantity < oi.quantity`,
            [order.order_id]
          );
          if (short.rows.length > 0) {
            console.error(
              `Order ${order.order_id} PAID but short on stock for: ${short.rows
                .map((r) => r.product_name)
                .join(", ")}`
            );
          }

          await client.query(
            `UPDATE products p
            SET stock_quantity = GREATEST(p.stock_quantity - oi.quantity, 0)
            FROM order_items oi
            WHERE oi.order_id = $1 AND oi.product_id = p.product_id`,
            [order.order_id]
          );

          const emailRes = await client.query(
            `SELECT u.email, oi.quantity, oi.price, p.product_name
             FROM order_items oi
             JOIN products p ON p.product_id = oi.product_id
             JOIN users u ON u.user_id = $2
             WHERE oi.order_id = $1`,
            [order.order_id, upd.rows[0].user_id]
          );
          if (emailRes.rows.length > 0) {
            userEmail = emailRes.rows[0].email;
            itemsForEmail = emailRes.rows.map((row) => ({
              name: row.product_name,
              quantity: row.quantity,
              price: parseFloat(row.price),
            }));
          }

          // Remove only the items that were ordered, not anything the customer
          // added to their cart while they were paying.
          await client.query(
            `DELETE FROM cart
             WHERE user_id = $1
               AND product_id IN (SELECT product_id FROM order_items WHERE order_id = $2)`,
            [upd.rows[0].user_id, order.order_id]
          );
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        // The customer HAS been charged but the order couldn't be finalized.
        // The order stays 'processing' on purpose so it is easy to find and
        // fix by hand (check the PayMongo dashboard), and a retry can't
        // double-charge.
        console.error(`Order ${order.order_id} charged but NOT finalized:`, e);
        throw e;
      } finally {
        client.release();
      }

      // Send the confirmation email after commit, a failure here shouldn't
      // undo the payment confirmation, so just log and move on.
      if (userEmail) {
        try {
          await sendOrderConfirmationEmail(
            userEmail,
            order.recipient_name || "there",
            order.order_id,
            itemsForEmail,
            parseFloat(order.total_amount)
          );
        } catch (emailError) {
          console.error(`Order ${order.order_id} paid, but confirmation email failed:`, emailError);
        }
      }
    } else if (verifiedPayment && paymentAttributes.status === "failed") {
      await pool.query(
        `UPDATE orders SET payment_status = 'failed'
        WHERE order_id = $1
          AND paymongo_source_id = $2
          AND payment_status = 'processing'`,
        [order.order_id, sourceId]
      );
    } else {
      console.error(
        `Order ${order.order_id}, source ${sourceId}: unresolved payment response`,
        { httpStatus: payRes.status, paymentId: payment?.data?.id }
      );

      return new Response("Payment outcome requires verification", {
        status: 500,
      });
    }
  }

  return new Response("ok", { status: 200 });
}