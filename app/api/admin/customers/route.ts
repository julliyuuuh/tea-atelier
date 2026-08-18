import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const result = await pool.query(`
    SELECT
      u.user_id, u.first_name, u.last_name, u.email, u.phone_number,
      u.is_verified, u.date_created,
      COUNT(o.order_id) AS order_count,
      COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.user_id
    WHERE u.role = 'customer'
    GROUP BY u.user_id
    ORDER BY u.date_created DESC
  `);

  const customers = result.rows.map((row) => ({
    id: row.user_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    phone: row.phone_number,
    isVerified: row.is_verified,
    orderCount: parseInt(row.order_count, 10),
    totalSpent: parseFloat(row.total_spent),
    joinedAt: row.date_created,
  }));

  return NextResponse.json({ customers });
}