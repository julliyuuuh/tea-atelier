// app/api/cms/admin/about-pillars/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const result = await pool.query(
    "SELECT * FROM about_pillars ORDER BY sort_order ASC"
  );
  return NextResponse.json({ pillars: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { title, copy, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO about_pillars (title, copy, sort_order)
     VALUES ($1, $2, COALESCE($3, 0))
     RETURNING *`,
    [title, copy, sort_order]
  );

  return NextResponse.json({ pillar: result.rows[0] }, { status: 201 });
}