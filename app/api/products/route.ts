import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity
      FROM products
      WHERE is_archived = false
      ORDER BY product_id DESC`,
    );

    const products = result.rows.map((row) => ({
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      subCategory: row.sub_category,
      type: row.type,
      price: parseFloat(row.price),
      availability:
        row.status === "IN STOCK" && row.stock_quantity > 0
          ? "In Stock"
          : "Out of Stock",
      stockQuantity: row.stock_quantity,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to load products." },
      { status: 500 },
    );
  }
}
