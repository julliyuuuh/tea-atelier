// app/api/cms/collections-items/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM collections_items WHERE is_active = true ORDER BY sort_order ASC"
  );
  return NextResponse.json({ items: result.rows });
}