import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  // Bottom 5 products by stock quantity (active only aka not deleted/archived)
  const lowStockResult = await pool.query(`
    SELECT product_id, product_name, stock_quantity
    FROM products
    WHERE is_archived = false
    ORDER BY stock_quantity ASC
    LIMIT 5
  `);

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS revenue,
      (SELECT COUNT(*) FROM products) AS total_products,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers
  `);

  // Top 5 products by revenue (quantity * price per line item)
  const topProductsResult = await pool.query(`
    SELECT
      p.product_id AS product_id,
      p.product_name AS product_name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.quantity * oi.price) AS revenue
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    GROUP BY p.product_id, p.product_name
    ORDER BY revenue DESC
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
    topProducts: topProductsResult.rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      revenue: parseFloat(row.revenue),
      unitsSold: parseInt(row.units_sold, 10),
    })),
    lowStock: lowStockResult.rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      stockQuantity: parseInt(row.stock_quantity, 10),
    })),
  });
}