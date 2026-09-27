// app/api/cms/admin/faq/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const result = await pool.query("SELECT * FROM faq_items ORDER BY sort_order ASC");
  return NextResponse.json({ items: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { question, answer, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO faq_items (question, answer, sort_order)
     VALUES ($1, $2, COALESCE($3, 0))
     RETURNING *`,
    [question, answer, sort_order]
  );

  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
}