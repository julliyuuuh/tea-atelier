import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();

  const orderRes = await pool.query(
    `SELECT order_id, payment_status, paymongo_source_id
     FROM orders WHERE order_id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  const order = orderRes.rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Already resolved, nothing to check
  if (order.payment_status !== "pending" || !order.paymongo_source_id) {
    return NextResponse.json({ paymentStatus: order.payment_status });
  }

  const res = await fetch(`https://api.paymongo.com/v1/sources/${order.paymongo_source_id}`, {
    headers: {
      Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
    },
  });
  const source = await res.json();
  const sourceStatus = source.data?.attributes?.status; // pending | chargeable | paid | expired | failed | cancelled

  if (sourceStatus === "expired" || sourceStatus === "failed" || sourceStatus === "cancelled") {
    await pool.query(
      `UPDATE orders SET payment_status = 'failed' WHERE order_id = $1 AND payment_status = 'pending'`,
      [orderId]
    );
    return NextResponse.json({ paymentStatus: "failed" });
  }

  // Still pending or chargeable-but-not-yet-webhooked — leave as pending
  return NextResponse.json({ paymentStatus: "pending" });
}