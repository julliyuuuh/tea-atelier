// app/api/cms/admin/about-pillars/[id]/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { id } = await params;
  const { title, copy, sort_order } = await req.json();

  const result = await pool.query(
    `UPDATE about_pillars
     SET title = $1, copy = $2, sort_order = $3
     WHERE id = $4
     RETURNING *`,
    [title, copy, sort_order, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Pillar not found" }, { status: 404 });
  }

  return NextResponse.json({ pillar: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { id } = await params;
  await pool.query("DELETE FROM about_pillars WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}

