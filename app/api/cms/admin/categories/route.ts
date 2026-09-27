import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

// List all (including inactive, for admin view)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const result = await pool.query(
    "SELECT * FROM homepage_categories ORDER BY sort_order ASC"
  );
  return NextResponse.json({ categories: result.rows });
}

// Create new
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { name, image, description, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO homepage_categories (name, image, description, sort_order)
     VALUES ($1, $2, $3, COALESCE($4, 0))
     RETURNING *`,
    [name, image, description, sort_order]
  );

  return NextResponse.json({ category: result.rows[0] }, { status: 201 });
}