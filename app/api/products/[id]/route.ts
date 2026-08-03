import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT product_id, product_name, product_desc, product_image, category, price, status, stock_quantity
       FROM products WHERE product_id = $1 AND is_archived = false`,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const product = {
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    };

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load product." }, { status: 500 });
  }
}