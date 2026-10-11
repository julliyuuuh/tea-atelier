import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  CartError,
  cartProductId,
  cartQuantity,
  changeCartItem,
} from "@/lib/cart-api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const { productId } = await params;
  try {
    const body = await req.json().catch(() => null);
    await changeCartItem(
      userId!,
      cartProductId(productId),
      cartQuantity(body?.quantity),
      false,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CartError ? error.message : "Unable to update cart.",
      },
      { status: error instanceof CartError ? error.status : 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const { productId } = await params;

  try {
    cartProductId(productId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid product." },
      { status: 400 },
    );
  }
  await pool.query("DELETE FROM cart WHERE user_id = $1 AND product_id = $2", [
    userId,
    productId,
  ]);
  return NextResponse.json({ success: true });
}
