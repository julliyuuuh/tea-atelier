import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await pool.query(
    "SELECT * FROM homepage_why_choose_us ORDER BY sort_order ASC"
  );
  return NextResponse.json({ reasons: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { title, copy, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO homepage_why_choose_us (title, copy, sort_order)
     VALUES ($1, $2, COALESCE($3, 0))
     RETURNING *`,
    [title, copy, sort_order]
  );

  return NextResponse.json({ reason: result.rows[0] }, { status: 201 });
}