import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        p.product_id,
        p.product_name,
        p.product_desc,
        p.product_image,
        p.category,
        p.sub_category,
        p.type,
        p.price,
        p.status,
        p.stock_quantity,
        SUM(oi.quantity * oi.price) AS revenue
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE p.is_archived = false
      GROUP BY
        p.product_id, p.product_name, p.product_desc, p.product_image,
        p.category, p.sub_category, p.type, p.price, p.status, p.stock_quantity
      ORDER BY revenue DESC
      LIMIT 6
    `);

    const products = result.rows.map((row) => ({
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      subCategory: row.sub_category,
      type: row.type,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Best sellers fetch error:", error);
    return NextResponse.json({ error: "Unable to load best sellers." }, { status: 500 });
  }
}