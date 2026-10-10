import { NextResponse } from "next/server";
import { fetchPayment, finalizePayment } from "@/lib/paymongo-payment";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const orderId = Number(body?.orderId);

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  try {
    const readOrder = async () => {
      const result = await pool.query(
        `SELECT *
         FROM orders
         WHERE order_id = $1 AND user_id = $2`,
        [orderId, userId],
      );

      return result.rows[0];
    };

    const order = await readOrder();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.payment_status !== "paid" && order.paymongo_payment_id) {
      const payment = await fetchPayment(order.paymongo_payment_id);
      await finalizePayment(order, payment);
      return NextResponse.json({ paymentStatus: "paid" });
    }
    if (order.order_status === "CANCELLED") {
      return NextResponse.json({ paymentStatus: "cancelled" });
    }
    if (
      order.payment_status === "paid" ||
      order.payment_status === "processing" ||
      order.payment_status === "cancelled"
    ) {
      return NextResponse.json({
        paymentStatus: order.payment_status,
      });
    }

    // No source has been saved yet. Source creation is handled separately.
    if (!order.paymongo_source_id) {
      return NextResponse.json({
        paymentStatus: order.payment_status,
      });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Unable to verify payment. Please check again." },
        { status: 503 },
      );
    }

    const sourceId = order.paymongo_source_id;

    const res = await fetch(
      `https://api.paymongo.com/v1/sources/${encodeURIComponent(sourceId)}`,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(secretKey + ":").toString("base64"),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const source = await res.json().catch(() => null);

    if (
      !res.ok ||
      source?.data?.id !== sourceId ||
      source.data.attributes?.amount !==
        Math.round(Number(order.total_amount) * 100) ||
      source.data.attributes.currency !== "PHP" ||
      source.data.attributes.livemode !== !secretKey.startsWith("sk_test_")
    ) {
      return NextResponse.json(
        { error: "Unable to verify payment. Please check again." },
        { status: 502 },
      );
    }

    const sourceStatus = source.data.attributes?.status;

    // A webhook or another request may have changed the order during fetch.
    const latest = await readOrder();

    if (!latest) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (
      latest.payment_status === "paid" ||
      latest.payment_status === "processing" ||
      latest.payment_status === "cancelled"
    ) {
      return NextResponse.json({
        paymentStatus: latest.payment_status,
      });
    }

    if (latest.paymongo_source_id !== sourceId) {
      return NextResponse.json(
        { error: "Payment attempt changed. Please check again." },
        { status: 409 },
      );
    }

    if (
      sourceStatus === "expired" ||
      sourceStatus === "failed" ||
      sourceStatus === "cancelled"
    ) {
      const updated = await pool.query(
        `UPDATE orders
         SET payment_status = 'failed'
         WHERE order_id = $1
           AND user_id = $2
           AND paymongo_source_id = $3
           AND payment_status IN ('pending', 'failed')
         RETURNING payment_status`,
        [orderId, userId, sourceId],
      );

      if (updated.rows.length > 0) {
        return NextResponse.json({ paymentStatus: "failed" });
      }

      // Never report failure if a webhook won the race.
      const current = await readOrder();

      if (
        current?.payment_status === "paid" ||
        current?.payment_status === "processing" ||
        current?.payment_status === "cancelled"
      ) {
        return NextResponse.json({
          paymentStatus: current.payment_status,
        });
      }

      return NextResponse.json(
        { error: "Payment status changed. Please check again." },
        { status: 409 },
      );
    }

    if (sourceStatus === "chargeable") {
      // This is a UI status only. The webhook must claim the database
      // processing status itself before creating the payment.
      return NextResponse.json({ paymentStatus: "processing" });
    }

    if (sourceStatus === "pending") {
      return NextResponse.json({ paymentStatus: "pending" });
    }

    // An unknown provider status must not enable another payment attempt.
    return NextResponse.json(
      { error: "Payment outcome is unresolved. Please check again." },
      { status: 502 },
    );
  } catch (error) {
    console.error("Payment status check failed:", error);

    return NextResponse.json(
      { error: "Unable to verify payment. Please check again." },
      { status: 502 },
    );
  }
}
