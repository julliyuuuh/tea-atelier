import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query("SELECT * FROM homepage_promo LIMIT 1");
  return NextResponse.json({ promo: result.rows[0] ?? null });
}