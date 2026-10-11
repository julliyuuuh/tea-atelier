// app/api/cms/admin/collections-items/[id]/route.ts
import { adminQuery } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const { name, description, image, href, sort_order, is_active } =
    await req.json();

  const result = await adminQuery(
    decoded!.userId,
    `UPDATE collections_items
     SET name = $1, description = $2, image = $3, href = $4, sort_order = $5, is_active = $6
     WHERE id = $7
     RETURNING *`,
    [name, description, image, href, sort_order, is_active, id],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await adminQuery(
    decoded!.userId,
    "DELETE FROM collections_items WHERE id = $1",
    [id],
  );

  return NextResponse.json({ success: true });
}
