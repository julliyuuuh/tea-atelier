import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.product_name, p.product_desc, p.product_image, p.category,
        p.sub_category, p.type, p.price, p.status, p.stock_quantity,
        COALESCE(sales.units_sold, 0) AS units_sold
      FROM products p
      LEFT JOIN (
        SELECT oi.product_id, SUM(oi.quantity)::bigint AS units_sold
        FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
        WHERE o.payment_status = 'paid' AND o.order_status <> 'CANCELLED'
        GROUP BY oi.product_id
      ) sales ON sales.product_id = p.product_id
      WHERE p.is_archived = false
      ORDER BY p.product_id DESC`,
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
      unitsSold: Number(row.units_sold),
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
