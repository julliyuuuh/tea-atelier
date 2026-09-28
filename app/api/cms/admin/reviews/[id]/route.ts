// app/api/cms/admin/reviews/[id]/route.ts
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
  const { quote, name, rating, sort_order, is_active } = await req.json();

  const result = await pool.query(
    `UPDATE homepage_reviews
     SET quote = $1, name = $2, rating = $3, sort_order = $4, is_active = $5
     WHERE id = $6
     RETURNING *`,
    [quote, name, rating, sort_order, is_active, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({ review: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await pool.query("DELETE FROM homepage_reviews WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}