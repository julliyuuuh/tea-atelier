import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const { quantity } = await req.json();
  if (!quantity || quantity < 1) {
    return NextResponse.json({ error: "quantity must be at least 1" }, { status: 400 });
  }

  await pool.query(
    "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
    [quantity, userId, productId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;

  await pool.query(
    "DELETE FROM cart WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return NextResponse.json({ success: true });
}