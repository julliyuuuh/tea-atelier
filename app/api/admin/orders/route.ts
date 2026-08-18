import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const result = await pool.query(`
    SELECT
      o.order_id, o.total_amount, o.order_status, o.payment_method,
      o.recipient_name, o.created_at,
      u.email AS customer_email,
      COUNT(oi.order_items_id) AS item_count
    FROM orders o
    JOIN users u ON u.user_id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_id, u.email
    ORDER BY o.created_at DESC
  `);

  const orders = result.rows.map((row) => ({
    id: row.order_id,
    customerEmail: row.customer_email,
    recipientName: row.recipient_name,
    totalAmount: parseFloat(row.total_amount),
    status: row.order_status,
    paymentMethod: row.payment_method,
    itemCount: parseInt(row.item_count, 10),
    createdAt: row.created_at,
  }));

  return NextResponse.json({ orders });
}