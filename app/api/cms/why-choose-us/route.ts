import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM homepage_why_choose_us ORDER BY sort_order ASC"
  );
  return NextResponse.json({ reasons: result.rows });
}