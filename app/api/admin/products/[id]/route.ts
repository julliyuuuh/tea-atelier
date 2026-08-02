import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const { name, category, price, image, description, stockQuantity } = await req.json();
  const status = stockQuantity > 0 ? "IN STOCK" : "NO STOCK";

  const result = await pool.query(
    `UPDATE products
     SET product_name = $1, product_desc = $2, product_image = $3, category = $4, price = $5, status = $6, stock_quantity = $7
     WHERE product_id = $8
     RETURNING product_id, product_name, product_desc, product_image, category, price, status, stock_quantity`,
    [name, description, image, category, price, status, stockQuantity, id]
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  await pool.query("DELETE FROM products WHERE product_id = $1", [id]);

  return NextResponse.json({ success: true });
}