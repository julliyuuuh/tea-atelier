import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

const VALID_STATUSES = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const { status } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = await pool.query(
    "UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING order_id",
    [status, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}