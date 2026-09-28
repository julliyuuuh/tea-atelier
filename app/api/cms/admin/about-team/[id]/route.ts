// app/api/cms/admin/about-team/[id]/route.ts
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
  const { name, role, image, sort_order, is_active } = await req.json();

  const result = await pool.query(
    `UPDATE about_team
     SET name = $1, role = $2, image = $3, sort_order = $4, is_active = $5
     WHERE id = $6
     RETURNING *`,
    [name, role, image, sort_order, is_active, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  return NextResponse.json({ member: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await pool.query("DELETE FROM about_team WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}