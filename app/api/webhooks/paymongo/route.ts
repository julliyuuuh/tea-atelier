import { captureAuthorizedWallet } from "@/lib/paymongo-wallet";
import { reconcileCardSession } from "@/lib/paymongo-card";
import { verifyPaymongoSignature } from "@/lib/paymongo";
import { pool } from "@/lib/db";
import {
  fetchPayment,
  finalizePayment,
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
  if (type === "checkout_session.payment.paid") {
    if (typeof resource?.id !== "string")
      return new Response("Invalid checkout event", { status: 400 });
    try {
      await reconcileCardSession(resource.id);
      return new Response("ok");
    } catch {
      return new Response("Card payment needs verification", { status: 503 });
    }
  }
  if (!["source.chargeable", "payment.paid"].includes(type))
    return new Response("ok");
  if (typeof resource?.id !== "string")
    return new Response("Invalid event", { status: 400 });
  try {
    // Verify the actual payment through PayMongo for capture/recovery events.
    const captured =
      type === "payment.paid" ? await fetchPayment(resource.id) : null;
    if (captured?.attributes.payment_intent_id) {
      const card = await pool.query(
        "SELECT * FROM orders WHERE payment_method='card' AND paymongo_payment_intent_id=$1",
        [captured.attributes.payment_intent_id],
      );
      if (card.rows[0]) {
        await finalizePayment(card.rows[0], captured);
        return new Response("ok");
      }
      // Non-card Payment Intents may still belong to the legacy Sources flow.
    }
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
    const status = await captureAuthorizedWallet(order, {
      id: sourceId,
      attributes: a,
    });
    return new Response(
      status === "processing" ? "Payment is awaiting verification" : "ok",
      { status: status === "processing" ? 503 : 200 },
    );
  } catch (error) {
    console.error("PayMongo webhook requires verification:", error);
    return new Response("Payment outcome requires verification", {
      status: 503,
    });
  }
}
