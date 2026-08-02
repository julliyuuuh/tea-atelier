import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { name, category, price, image, description, stockQuantity } = await req.json();

  const status = stockQuantity > 0 ? "IN STOCK" : "NO STOCK";

  const result = await pool.query(
    `INSERT INTO products (product_name, product_desc, product_image, category, price, status, stock_quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING product_id, product_name, product_desc, product_image, category, price, status, stock_quantity`,
    [name, description, image, category, price, status, stockQuantity]
  );

  const row = result.rows[0];
  return NextResponse.json({
    product: {
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    },
  });
}