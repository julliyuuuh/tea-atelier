// app/api/cms/admin/privacy-sections/[id]/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const { heading, body, sort_order, is_active } = await req.json();

  const result = await pool.query(
    `UPDATE privacy_sections
     SET heading = $1, body = $2, sort_order = $3, is_active = $4
     WHERE id = $5
     RETURNING *`,
    [heading, body, sort_order, is_active, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json({ section: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await pool.query("DELETE FROM privacy_sections WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}