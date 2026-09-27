// app/api/cms/about-pillars/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM about_pillars ORDER BY sort_order ASC"
  );
  return NextResponse.json({ pillars: result.rows });
}