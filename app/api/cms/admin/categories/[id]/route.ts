import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { id } = await params; // Next.js 16 async params, per your existing convention
  const { name, image, description, sort_order, is_active } = await req.json();

  const result = await pool.query(
    `UPDATE homepage_categories
     SET name = $1, image = $2, description = $3, sort_order = $4, is_active = $5
     WHERE id = $6
     RETURNING *`,
    [name, image, description, sort_order, is_active, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { id } = await params;
  await pool.query("DELETE FROM homepage_categories WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}