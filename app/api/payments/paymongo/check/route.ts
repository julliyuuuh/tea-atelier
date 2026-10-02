import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

// A pending order older than this is treated as abandoned
const ABANDONED_AFTER_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, redirectFailed } = await req.json();

  const orderRes = await pool.query(
    `SELECT order_id, payment_status, paymongo_source_id, created_at
     FROM orders WHERE order_id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  const order = orderRes.rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.payment_status !== "pending" || !order.paymongo_source_id) {
    return NextResponse.json({ paymentStatus: order.payment_status });
  }

  const res = await fetch(`https://api.paymongo.com/v1/sources/${order.paymongo_source_id}`, {
    headers: {
      Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
    },
  });
  const source = await res.json();
  const sourceStatus = source.data?.attributes?.status;

  const markFailed = async () => {
    await pool.query(
      `UPDATE orders SET payment_status = 'failed' WHERE order_id = $1 AND payment_status = 'pending'`,
      [orderId]
    );
    return NextResponse.json({ paymentStatus: "failed" });
  };

  if (sourceStatus === "expired" || sourceStatus === "failed" || sourceStatus === "cancelled") {
    return markFailed();
  }

  // Customer came back through the failed redirect and the source never became
  // chargeable: treat as failed. A "chargeable" source is excluded on purpose,
  // because the webhook is about to charge it.
  if (redirectFailed === true && sourceStatus === "pending") {
    return markFailed();
  }

  // Abandoned: still pending long after it was created
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  if (sourceStatus === "pending" && ageMs > ABANDONED_AFTER_MS) {
    return markFailed();
  }

  return NextResponse.json({ paymentStatus: "pending" });
}