import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM homepage_reviews WHERE is_active = true ORDER BY sort_order ASC"
  );
  return NextResponse.json({ reviews: result.rows });
}