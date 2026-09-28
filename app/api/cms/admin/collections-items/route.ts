// app/api/cms/admin/collections-items/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await pool.query(
    "SELECT * FROM collections_items ORDER BY sort_order ASC"
  );
  return NextResponse.json({ items: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { name, description, image, href, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO collections_items (name, description, image, href, sort_order)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0))
     RETURNING *`,
    [name, description, image, href, sort_order]
  );

  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
}