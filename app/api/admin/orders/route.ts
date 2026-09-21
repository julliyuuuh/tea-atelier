import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { ORDER_STATUSES } from "@/lib/order-status";

const VALID_STATUSES: string[] = ORDER_STATUSES.map((s) => s.value);

// Column allowlist for ORDER BY — never interpolate the sort key directly,
// since it comes from the query string. item_count/total_amount are safe to
// reference by their SELECT alias since they're computed above the ORDER BY.
const SORT_COLUMNS: Record<string, string> = {
  id: "o.order_id",
  totalAmount: "o.total_amount",
  createdAt: "o.created_at",
  itemCount: "item_count",
};

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status") || "All";
  const sortByParam = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "DESC" : "ASC";

  const sortColumn = SORT_COLUMNS[sortByParam] || "o.created_at";

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (search) {
    // Mirrors the frontend's match against "TA-{id}", recipient name, and email.
    conditions.push(
      `(('TA-' || o.order_id::text) ILIKE $${i} OR o.recipient_name ILIKE $${i} OR u.email ILIKE $${i})`,
    );
    values.push(`%${search}%`);
    i++;
  }

  if (status !== "All") {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
    }
    conditions.push(`o.order_status = $${i}`);
    values.push(status);
    i++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query doesn't need order_items — none of the filters touch item_count.
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM orders o
     JOIN users u ON u.user_id = o.user_id
     ${whereClause}`,
    values,
  );
  const total = countResult.rows[0].count;

  const offset = (page - 1) * limit;
  const dataResult = await pool.query(
    `SELECT
       o.order_id, o.total_amount, o.order_status, o.payment_method,
       o.recipient_name, o.created_at,
       u.email AS customer_email,
       COUNT(oi.order_items_id) AS item_count
     FROM orders o
     JOIN users u ON u.user_id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.order_id
     ${whereClause}
     GROUP BY o.order_id, u.email
     ORDER BY ${sortColumn} ${sortDir}, o.order_id DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset],
  );

  const orders = dataResult.rows.map((row) => ({
    id: row.order_id,
    customerEmail: row.customer_email,
    recipientName: row.recipient_name,
    totalAmount: parseFloat(row.total_amount),
    status: row.order_status,
    paymentMethod: row.payment_method,
    itemCount: parseInt(row.item_count, 10),
    createdAt: row.created_at,
  }));


  const statsResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE order_status = 'PLACED')::int AS pending,
       COUNT(*) FILTER (WHERE order_status = 'CANCELLED')::int AS cancelled
     FROM orders`,
  );
  const s = statsResult.rows[0];

  return NextResponse.json({
    orders,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: {
      total: s.total,
      pending: s.pending,
      cancelled: s.cancelled,
    },
  });
}