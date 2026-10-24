import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  try {
    const { rows } = await pool.query(`SELECT
 (SELECT COUNT(*)::int FROM order_returns WHERE status='REQUESTED') AS requests,
 (SELECT COUNT(*)::int FROM contact_messages WHERE status='new') AS messages,
 (SELECT COUNT(*)::int FROM products WHERE is_archived=false AND stock_quantity<=10) AS stock,
 (SELECT COUNT(*)::int FROM orders WHERE NULLIF(payment_fulfillment_issue,'') IS NOT NULL) AS payments`);
    return NextResponse.json(rows[0], {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load pending tasks." },
      { status: 500 },
    );
  }
}
