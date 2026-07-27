import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

function toAvailability(status: string): "In Stock" | "Out of Stock" {
  return status === "IN STOCK" ? "In Stock" : "Out of Stock";
}

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await pool.query(
    `SELECT
       p.product_id,
       p.product_name,
       p.category,
       p.price,
       p.product_image,
       p.product_desc,
       p.status,
       p.stock_quantity,
       c.quantity AS cart_quantity
     FROM cart c
     JOIN products p ON p.product_id = c.product_id
     WHERE c.user_id = $1`,
    [userId]
  );

  const items = result.rows.map((row) => ({
    product: {
      id: String(row.product_id),
      name: row.product_name,
      category: row.category,
      price: parseFloat(row.price),
      image: row.product_image,
      description: row.product_desc,
      availability: toAvailability(row.status),
      stockQuantity: row.stock_quantity,
    },
    quantity: row.cart_quantity,
  }));

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity = 1 } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const productResult = await pool.query(
    "SELECT stock_quantity FROM products WHERE product_id = $1",
    [productId]
  );
  const product = productResult.rows[0];
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const existing = await pool.query(
    "SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );

  const currentCartQuantity = existing.rows[0]?.quantity || 0;
  const newTotalQuantity = currentCartQuantity + quantity;

  if (newTotalQuantity > product.stock_quantity) {
    return NextResponse.json(
      { error: `Only ${product.stock_quantity} in stock.` },
      { status: 400 }
    );
  }

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3",
      [quantity, userId, productId]
    );
  } else {
    await pool.query(
      "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)",
      [userId, productId, quantity]
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);
  return NextResponse.json({ success: true });
}