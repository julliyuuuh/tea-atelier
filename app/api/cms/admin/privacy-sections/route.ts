// app/api/cms/admin/privacy-sections/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const result = await pool.query("SELECT * FROM privacy_sections ORDER BY sort_order ASC");
  return NextResponse.json({ sections: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { heading, body, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO privacy_sections (heading, body, sort_order)
     VALUES ($1, $2, COALESCE($3, 0))
     RETURNING *`,
    [heading, body, sort_order]
  );

  return NextResponse.json({ section: result.rows[0] }, { status: 201 });
}