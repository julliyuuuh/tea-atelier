import { verifyPaymongoSignature } from "@/lib/paymongo";
import { pool } from "@/lib/db";
import {
  fetchPayment,
  finalizePayment,
  matchesPayment,
  type PaymentOrder,
} from "@/lib/paymongo-payment";

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (
    !process.env.PAYMONGO_WEBHOOK_SECRET ||
    !process.env.PAYMONGO_SECRET_KEY
  ) {
    return new Response("Webhook configuration unavailable", { status: 503 });
  }
  if (
    !verifyPaymongoSignature(
      rawBody,
      req.headers.get("paymongo-signature"),
      process.env.PAYMONGO_WEBHOOK_SECRET,
    )
  ) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid event", { status: 400 });
  }
  const type = event?.data?.attributes?.type;
  const resource = event?.data?.attributes?.data;
  if (!["source.chargeable", "payment.paid"].includes(type))
    return new Response("ok");
  if (typeof resource?.id !== "string")
    return new Response("Invalid event", { status: 400 });
  try {
    // Verify the actual payment through PayMongo for capture/recovery events.
    const captured =
      type === "payment.paid" ? await fetchPayment(resource.id) : null;
    const sourceId = captured ? captured.attributes.source?.id : resource.id;
    if (typeof sourceId !== "string")
      return new Response("Invalid source", { status: 400 });
    const result = await pool.query(
      `SELECT * FROM orders WHERE paymongo_source_id = $1`,
      [sourceId],
    );
    const order = result.rows[0] as PaymentOrder | undefined;
    if (!order || order.payment_status === "paid") return new Response("ok");
    if (captured) {
      await finalizePayment(order, captured);
      return new Response("ok");
    }
    // Authorization of a cancelled order must never initiate a charge.
    if (
      order.order_status === "CANCELLED" ||
      order.payment_status === "cancelled"
    )
      return new Response("ok");
    if (order.paymongo_payment_id) {
      const existing = await fetchPayment(order.paymongo_payment_id);
      await finalizePayment(order, existing);
      return new Response("ok");
    }
    const a = resource.attributes;
    if (
      a?.amount !== Math.round(Number(order.total_amount) * 100) ||
      a.currency !== "PHP" ||
      a.livemode !== !process.env.PAYMONGO_SECRET_KEY.startsWith("sk_test_")
    ) {
      return new Response("Source does not match order", { status: 400 });
    }
    const claim = await pool.query(
      `UPDATE orders SET payment_status = 'processing'
      WHERE order_id = $1 AND paymongo_source_id = $2 AND order_status IS DISTINCT FROM 'CANCELLED'
        AND payment_status IN ('pending', 'failed') RETURNING order_id`,
      [order.order_id, sourceId],
    );
    if (!claim.rows.length) {
      // An uncertain previous POST is not safe to resend. Retry the event so
      // a saved payment ID can recover finalization; payment.paid also recovers it.
      return new Response("Payment is awaiting verification", { status: 503 });
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
    const body = await response.json();
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
    if (payment.attributes.status === "paid")
      await finalizePayment(order, payment);
    else if (payment.attributes.status === "failed") {
      await pool.query(
        `UPDATE orders SET payment_status = 'failed'
        WHERE order_id = $1 AND paymongo_source_id = $2 AND payment_status = 'processing'`,
        [order.order_id, sourceId],
      );
    } else throw new Error("Unresolved payment outcome");
    return new Response("ok");
  } catch (error) {
    console.error("PayMongo webhook requires verification:", error);
    return new Response("Payment outcome requires verification", {
      status: 503,
    });
  }
}
