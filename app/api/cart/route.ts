import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await pool.query(
    "SELECT product_id, quantity FROM cart WHERE user_id = $1",
    [userId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity = 1 } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const existing = await pool.query(
    "SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );

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