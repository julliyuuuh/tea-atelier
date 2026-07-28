import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS revenue,
      (SELECT COUNT(*) FROM products) AS total_products,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers
  `);

  const recentOrdersResult = await pool.query(`
    SELECT order_id, recipient_name, total_amount, order_status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
  `);

  const stats = statsResult.rows[0];

  return NextResponse.json({
    stats: {
      totalOrders: parseInt(stats.total_orders, 10),
      revenue: parseFloat(stats.revenue),
      totalProducts: parseInt(stats.total_products, 10),
      totalCustomers: parseInt(stats.total_customers, 10),
    },
    recentOrders: recentOrdersResult.rows.map((row) => ({
      id: row.order_id,
      recipientName: row.recipient_name,
      totalAmount: parseFloat(row.total_amount),
      status: row.order_status,
      createdAt: row.created_at,
    })),
  });
}