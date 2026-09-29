import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { ORDER_STATUSES } from "@/lib/order-status";
import { MANUAL_PAYMENT_STATUSES, isCod } from "@/lib/payment-status";

const VALID_STATUSES: string[] = ORDER_STATUSES.map((s) => s.value);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const { status, paymentStatus } = await req.json();

  if (status === undefined && paymentStatus === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (paymentStatus !== undefined && !MANUAL_PAYMENT_STATUSES.includes(paymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
  }

  const current = await pool.query(
    "SELECT order_status, payment_method FROM orders WHERE order_id = $1",
    [id]
  );
  if (current.rows.length === 0) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const order = current.rows[0];

  if (paymentStatus !== undefined) {
    // Online payments (GCash/Maya) are owned by the PayMongo webhook.
    if (!isCod(order.payment_method)) {
      return NextResponse.json(
        { error: "Online payments are updated automatically by PayMongo." },
        { status: 403 }
      );
    }
    if ((status ?? order.order_status) === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled orders can't have their payment status changed." },
        { status: 400 }
      );
    }
  }

  const sets: string[] = [];
  const vals: any[] = [];
  if (status !== undefined) {
    vals.push(status);
    sets.push(`order_status = $${vals.length}`);
  }
  if (paymentStatus !== undefined) {
    vals.push(paymentStatus);
    sets.push(`payment_status = $${vals.length}`);
  }
  vals.push(id);

  await pool.query(
    `UPDATE orders SET ${sets.join(", ")} WHERE order_id = $${vals.length}`,
    vals
  );

  return NextResponse.json({ success: true });
}