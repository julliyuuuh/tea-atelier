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
  const { name, category, subCategory, type, price, image, description, stockQuantity } =
    await req.json();
  const status = stockQuantity > 0 ? "IN STOCK" : "NO STOCK";

  const result = await pool.query(
    `UPDATE products
     SET product_name = $1, product_desc = $2, product_image = $3, category = $4, sub_category = $5, type = $6, price = $7, status = $8, stock_quantity = $9
     WHERE product_id = $10
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
      id,
    ]
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
      subCategory: row.sub_category,
      type: row.type,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  const result = await pool.query(
    "UPDATE products SET is_archived = false WHERE product_id = $1 RETURNING product_id",
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  try {
    const result = await pool.query(
      "UPDATE products SET is_archived = true WHERE product_id = $1 RETURNING product_id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Archive product error:", err);
    return NextResponse.json({ error: "Unable to remove product." }, { status: 500 });
  }
}