import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req);
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
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid' AND order_status <> 'CANCELLED') AS revenue,
      (SELECT COUNT(*) FROM products WHERE is_archived = false) AS total_products,
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
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.payment_status = 'paid' AND o.order_status <> 'CANCELLED'
    GROUP BY p.product_id, p.product_name
    ORDER BY revenue DESC
    LIMIT 5
  `);

  // One row per purchasing customer prevents repeat orders from inflating the
  // buyer count. Gross spend includes shipping and is intentionally before refunds.
  const customerInsightsResult = await pool.query(`
    WITH customer_purchases AS (
      SELECT o.user_id, COUNT(*) AS order_count,
             SUM(o.total_amount) AS total_spent
      FROM orders o
      JOIN users u ON u.user_id = o.user_id
      WHERE u.role = 'customer'
        AND o.payment_status = 'paid'
        AND o.order_status <> 'CANCELLED'
      GROUP BY o.user_id
    )
    SELECT COUNT(*) AS purchasing_customers,
           COUNT(*) FILTER (WHERE order_count >= 2) AS returning_customers,
           ROUND(COALESCE(AVG(total_spent), 0), 2) AS average_spend_per_buyer
    FROM customer_purchases
  `);

  const insights = customerInsightsResult.rows[0];
  const purchasingCustomers = Number(insights.purchasing_customers);
  const returningCustomers = Number(insights.returning_customers);

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
    customerInsights: {
      purchasingCustomers,
      firstTimeBuyers: purchasingCustomers - returningCustomers,
      returningCustomers,
      repeatPurchaseRate:
        purchasingCustomers === 0
          ? 0
          : Math.round((returningCustomers / purchasingCustomers) * 1000) / 10,
      averageSpendPerBuyer: Number(insights.average_spend_per_buyer),
    },
  });
}
