import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  CartError,
  cartProductId,
  cartQuantity,
  changeCartItem,
} from "@/lib/cart-api";

function toAvailability(status: string): "In Stock" | "Out of Stock" {
  return status === "IN STOCK" ? "In Stock" : "Out of Stock";
}

export async function GET(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const result = await pool.query(
    `SELECT
       p.product_id,
       p.product_name,
       p.category,
       p.sub_category,
       p.type,
       p.is_archived,
       p.price,
       p.product_image,
       p.product_desc,
       p.status,
       p.stock_quantity,
       c.quantity AS cart_quantity
     FROM cart c
     JOIN products p ON p.product_id = c.product_id
     WHERE c.user_id = $1`,
    [userId],
  );

  const items = result.rows.map((row) => ({
    product: {
      id: String(row.product_id),
      name: row.product_name,
      category: row.category,
      subCategory: row.sub_category,
      type: row.type,
      isArchived: row.is_archived,
      price: parseFloat(row.price),
      image: row.product_image,
      description: row.product_desc,
      availability:
        row.is_archived || row.stock_quantity <= 0
          ? "Out of Stock"
          : toAvailability(row.status),
      stockQuantity: row.stock_quantity,
    },
    quantity: row.cart_quantity,
  }));

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  try {
    const body = await req.json().catch(() => null);
    await changeCartItem(
      userId!,
      cartProductId(body?.productId),
      cartQuantity(body?.quantity === undefined ? 1 : body.quantity),
      true,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CartError ? error.message : "Unable to add to cart.",
      },
      { status: error instanceof CartError ? error.status : 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);
  return NextResponse.json({ success: true });
}
