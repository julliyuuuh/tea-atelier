// app/api/cms/about-team/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM about_team WHERE is_active = true ORDER BY sort_order ASC"
  );
  return NextResponse.json({ team: result.rows });
}