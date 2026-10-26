import { pool } from "@/lib/db";
import {
  fetchPayment,
  finalizePayment,
  matchesPayment,
  type PaymentOrder,
} from "@/lib/paymongo-payment";

type AuthorizedSource = {
  id: string;
  attributes: { amount: number; currency: string; livemode: boolean };
};
// The caller must obtain this source from a verified provider GET or a signed
// source.chargeable event. Both paths use the same atomic claim; an uncertain
// capture is never submitted again by polling or webhook retries.
export async function captureAuthorizedWallet(
  order: PaymentOrder,
  source: AuthorizedSource,
): Promise<"paid" | "failed" | "processing" | "cancelled"> {
  const sourceId = source.id;
  const a = source.attributes;
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (
    !key ||
    !["gcash", "grabpay"].includes(order.payment_method || "") ||
    sourceId !== order.paymongo_source_id ||
    !/^src_[a-zA-Z0-9]+$/.test(sourceId) ||
    a.amount !== Math.round(Number(order.total_amount) * 100) ||
    a.currency !== "PHP" ||
    a.livemode !== !key.startsWith("sk_test_")
  )
    throw new Error("Source does not match order");
  const claim = await pool.query(
    `UPDATE orders SET payment_status = 'processing'
      WHERE order_id = $1 AND paymongo_source_id = $2 AND order_status IS DISTINCT FROM 'CANCELLED'
        AND payment_status IN ('pending', 'failed') AND paymongo_payment_id IS NULL RETURNING order_id`,
    [order.order_id, sourceId],
  );
  if (!claim.rows.length) {
    // An uncertain previous POST is not safe to resend. Retry the event so
    // a saved payment ID can recover finalization; payment.paid also recovers it.
    const latest = (
      await pool.query("SELECT * FROM orders WHERE order_id=$1", [
        order.order_id,
      ])
    ).rows[0];
    if (latest?.paymongo_payment_id) {
      const payment = await fetchPayment(latest.paymongo_payment_id);
      await finalizePayment(latest, payment);
      return "paid";
    }
    if (
      latest?.payment_status === "paid" ||
      latest?.payment_status === "refunded"
    )
      return "paid";
    if (
      latest?.order_status === "CANCELLED" ||
      latest?.payment_status === "cancelled"
    )
      return "cancelled";
    return "processing";
  }
  const response = await fetch("https://api.paymongo.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      data: {
        attributes: {
          amount: a.amount,
          source: { id: sourceId, type: "source" },
          currency: "PHP",
        },
      },
    }),
  });
  const body = await response.json().catch(() => null);
  // An explicit authentication rejection did not execute a capture. Release
  // only this unconfirmed claim so a retry can recover after credentials are
  // corrected. Validation/state errors, throttling and timeouts stay blocked:
  // they do not prove that the source was never charged.
  if (response.status === 401 || response.status === 403) {
    await pool.query(
      `UPDATE orders SET payment_status = 'failed'
         WHERE order_id = $1 AND paymongo_source_id = $2
           AND payment_status = 'processing' AND paymongo_payment_id IS NULL`,
      [order.order_id, sourceId],
    );
    console.error("PayMongo rejected capture authentication", {
      orderId: order.order_id,
      httpStatus: response.status,
    });
    throw new Error(
      "Capture credentials rejected; retry after correcting configuration",
    );
  }
  const payment = body?.data;
  if (!response.ok || !matchesPayment(payment, order)) {
    console.error("PayMongo capture response requires verification", {
      orderId: order.order_id,
      sourceId,
      httpStatus: response.status,
      codes: Array.isArray(body?.errors)
        ? body.errors.map((error: { code?: string }) => error.code)
        : [],
    });
    throw new Error("Unverified payment response");
  }
  if (payment.attributes.status === "paid") {
    await finalizePayment(order, payment);
    return "paid";
  } else if (payment.attributes.status === "failed") {
    await pool.query(
      `UPDATE orders SET payment_status = 'failed'
        WHERE order_id = $1 AND paymongo_source_id = $2 AND payment_status = 'processing'`,
      [order.order_id, sourceId],
    );
    return "failed";
  } else throw new Error("Unresolved payment outcome");
}
