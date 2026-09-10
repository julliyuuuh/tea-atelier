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

// Column allowlist for ORDER BY — never interpolate the sort key directly,
// since it comes from the query string.
const SORT_COLUMNS: Record<string, string> = {
  name: "product_name",
  price: "price",
  stockQuantity: "stock_quantity",
};

export async function GET(req: Request) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const search = url.searchParams.get("search")?.trim() || "";
  const category = url.searchParams.get("category") || "All";
  const subCategory = url.searchParams.get("subCategory") || "All";
  const sortByParam = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "DESC" : "ASC";
  const archived = url.searchParams.get("archived") === "true";

  const sortColumn = SORT_COLUMNS[sortByParam] || "product_id";

  const conditions: string[] = ["is_archived = $1"];
  const values: any[] = [archived];
  let i = 2;

  if (search) {
    conditions.push(`product_name ILIKE $${i}`);
    values.push(`%${search}%`);
    i++;
  }

  if (category !== "All") {
    if (category === "Tea Accessories") {
      // Mirrors the frontend's "Tea Accessories" / legacy "Accessories" match.
      conditions.push(`(category = $${i} OR category = 'Accessories')`);
      values.push(category);
      i++;
    } else {
      conditions.push(`category = $${i}`);
      values.push(category);
      i++;
    }
  }

  if (subCategory !== "All") {
    conditions.push(`sub_category = $${i}`);
    values.push(subCategory);
    i++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM products ${whereClause}`,
    values,
  );
  const total = countResult.rows[0].count;

  const offset = (page - 1) * limit;
  const dataResult = await pool.query(
    `SELECT product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity, is_archived
     FROM products
     ${whereClause}
     ORDER BY ${sortColumn} ${sortDir}, product_id DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset],
  );

  const products = dataResult.rows.map((row) => ({
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

  const statsResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE NOT is_archived)::int AS active,
       COUNT(*) FILTER (WHERE NOT is_archived AND stock_quantity <= 0)::int AS out_of_stock,
       COUNT(*) FILTER (WHERE NOT is_archived AND stock_quantity > 0 AND stock_quantity <= 10)::int AS low_stock,
       COUNT(*) FILTER (WHERE is_archived)::int AS archived
     FROM products`,
  );
  const s = statsResult.rows[0];

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: {
      active: s.active,
      lowStock: s.low_stock,
      outOfStock: s.out_of_stock,
      archived: s.archived,
    },
  });
}