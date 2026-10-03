// app/api/orders/cancel/route.ts.

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

// This cancels an unpaid order, not an active PayMongo Source.
export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orderId = Number(body?.orderId);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT order_id, order_status, payment_status, payment_method,
              paymongo_source_id, total_amount
       FROM orders WHERE order_id = $1 AND user_id = $2`,
      [orderId, userId]
    );
    const order = result.rows[0];
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_status === "cancelled") {
      return NextResponse.json({ orderId, paymentStatus: "cancelled", orderStatus: "CANCELLED" });
    }
    if (!["gcash", "grabpay"].includes(order.payment_method) ||
        order.order_status !== "PLACED" ||
        !["pending", "failed"].includes(order.payment_status)) {
      return NextResponse.json({ error: "This order cannot be cancelled here." }, { status: 409 });
    }

    const sourceId = order.paymongo_source_id;
    if (sourceId) {
      const secret = process.env.PAYMONGO_SECRET_KEY;
      if (!secret) throw new Error("PAYMONGO_SECRET_KEY is not set");
      let source;
      let response: Response;
      try {
        response = await fetch(`https://api.paymongo.com/v1/sources/${encodeURIComponent(sourceId)}`, {
          headers: { Authorization: "Basic " + Buffer.from(secret + ":").toString("base64") },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        source = await response.json();
      } catch {
        return NextResponse.json({ error: "Unable to verify payment. Please check again." }, { status: 502 });
      }
      if (!response.ok || source?.data?.id !== sourceId) {
        return NextResponse.json({ error: "Unable to verify payment. Please check again." }, { status: 502 });
      }
      const status = source.data.attributes?.status;
      if (status === "pending") {
        return NextResponse.json({
          error: "The payment link is still active. This order can be cancelled once PayMongo confirms the source has failed, expired, or been cancelled. You can start a separate checkout meanwhile.",
          paymentStatus: "pending",
        }, { status: 409 });
      }
      if (status === "chargeable" || status === "paid") {
        return NextResponse.json({ error: "Payment has been authorized or is being confirmed. Check its status before cancelling." }, { status: 409 });
      }
      if (!["expired", "failed", "cancelled"].includes(status)) {
        return NextResponse.json({ error: "Payment status could not be verified. Please check again." }, { status: 502 });
      }
    }

    // The provider request above holds no database connection or transaction.
    // Recheck source and status atomically: a retry or webhook may have won.
    const cancelled = await pool.query(
      `UPDATE orders SET order_status = 'CANCELLED', payment_status = 'cancelled'
       WHERE order_id = $1 AND user_id = $2
         AND order_status = 'PLACED'
         AND payment_method IN ('gcash', 'grabpay')
         AND payment_status IN ('pending', 'failed')
         AND paymongo_source_id IS NOT DISTINCT FROM $3
       RETURNING order_id`,
      [orderId, userId, sourceId]
    );
    if (!cancelled.rows.length) {
      return NextResponse.json({ error: "The order changed while cancellation was being checked. Refresh its status and try again." }, { status: 409 });
    }
    // No cart or stock changes: unpaid e-wallet orders have not consumed stock.
    return NextResponse.json({ orderId, paymentStatus: "cancelled", orderStatus: "CANCELLED" });
  } catch (error) {
    console.error(`Order ${orderId}: cancellation failed`, error);
    return NextResponse.json({ error: "Unable to cancel this order. Please check again." }, { status: 500 });
  }
}
