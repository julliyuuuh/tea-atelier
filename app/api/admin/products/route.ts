import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { name, category, subCategory, type, price, image, description, stockQuantity } =
    await req.json();

  const status = stockQuantity > 0 ? "IN STOCK" : "NO STOCK";

  const result = await pool.query(
    `INSERT INTO products (product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity`,
    [
      name,
      description,
      image,
      category,
      subCategory || null,
      type || null,
      price,
      status,
      stockQuantity,
    ]
  );

  const row = result.rows[0];
  return NextResponse.json({
    product: {
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
    },
  });
}

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const result = await pool.query(
    `SELECT product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity, is_archived
     FROM products
     ORDER BY product_id DESC`
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
    availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
    stockQuantity: row.stock_quantity,
    isArchived: row.is_archived,
  }));

  return NextResponse.json({ products });
}