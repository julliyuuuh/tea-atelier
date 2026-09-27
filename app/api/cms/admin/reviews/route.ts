// app/api/cms/admin/reviews/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const result = await pool.query(
    "SELECT * FROM homepage_reviews ORDER BY sort_order ASC"
  );
  return NextResponse.json({ reviews: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { quote, name, rating, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO homepage_reviews (quote, name, rating, sort_order)
     VALUES ($1, $2, $3, COALESCE($4, 0))
     RETURNING *`,
    [quote, name, rating, sort_order]
  );

  return NextResponse.json({ review: result.rows[0] }, { status: 201 });
}