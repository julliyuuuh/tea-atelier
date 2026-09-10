import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// Column allowlist for ORDER BY — never interpolate the sort key directly,
// since it comes from the query string. order_count/total_spent are safe to
// reference by their SELECT alias since they're computed above the ORDER BY.
const SORT_COLUMNS: Record<string, string> = {
  name: "(u.first_name || ' ' || u.last_name)",
  orderCount: "order_count",
  totalSpent: "total_spent",
  joinedAt: "u.date_created",
};

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const search = url.searchParams.get("search")?.trim() || "";
  const verified = url.searchParams.get("verified") || "All";
  const sortByParam = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "DESC" : "ASC";

  const sortColumn = SORT_COLUMNS[sortByParam] || "u.date_created";

  const conditions: string[] = ["u.role = 'customer'"];
  const values: any[] = [];
  let i = 1;

  if (search) {
    conditions.push(
      `((u.first_name || ' ' || u.last_name) ILIKE $${i} OR u.email ILIKE $${i})`,
    );
    values.push(`%${search}%`);
    i++;
  }

  if (verified === "Verified") {
    conditions.push("u.is_verified = true");
  } else if (verified === "Unverified") {
    conditions.push("u.is_verified = false");
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Count query doesn't need the orders join — none of the filters touch
  // order_count/total_spent.
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM users u ${whereClause}`,
    values,
  );
  const total = countResult.rows[0].count;

  const offset = (page - 1) * limit;
  const dataResult = await pool.query(
    `SELECT
       u.user_id, u.first_name, u.last_name, u.email, u.phone_number,
       u.is_verified, u.date_created,
       COUNT(o.order_id) AS order_count,
       COALESCE(SUM(o.total_amount), 0) AS total_spent
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.user_id
     ${whereClause}
     GROUP BY u.user_id
     ORDER BY ${sortColumn} ${sortDir}, u.user_id DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset],
  );

  const customers = dataResult.rows.map((row) => ({
    id: row.user_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    phone: row.phone_number,
    isVerified: row.is_verified,
    orderCount: parseInt(row.order_count, 10),
    totalSpent: parseFloat(row.total_spent),
    joinedAt: row.date_created,
  }));

  const statsResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_verified)::int AS verified,
       COUNT(*) FILTER (WHERE NOT is_verified)::int AS unverified
     FROM users
     WHERE role = 'customer'`,
  );
  const s = statsResult.rows[0];

  return NextResponse.json({
    customers,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: {
      total: s.total,
      verified: s.verified,
      unverified: s.unverified,
    },
  });
}