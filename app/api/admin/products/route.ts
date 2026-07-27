import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { name, category, price, image, description, availability } = await req.json();

  const status = availability === "Out of Stock" ? "NO STOCK" : "IN STOCK";

  const result = await pool.query(
    `INSERT INTO products (product_name, product_desc, product_image, category, price, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING product_id, product_name, product_desc, product_image, category, price, status`,
    [name, description, image, category, price, status]
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
    },
  });
}