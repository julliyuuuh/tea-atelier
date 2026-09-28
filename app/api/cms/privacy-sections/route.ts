// app/api/cms/privacy-sections/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM privacy_sections WHERE is_active = true ORDER BY sort_order ASC"
  );
  return NextResponse.json({ sections: result.rows });
}