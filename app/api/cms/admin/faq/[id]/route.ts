// app/api/cms/admin/faq/[id]/route.ts
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
  const { question, answer, sort_order, is_active } = await req.json();

  const result = await pool.query(
    `UPDATE faq_items
     SET question = $1, answer = $2, sort_order = $3, is_active = $4
     WHERE id = $5
     RETURNING *`,
    [question, answer, sort_order, is_active, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "FAQ item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await pool.query("DELETE FROM faq_items WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}