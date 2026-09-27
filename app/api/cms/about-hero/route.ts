// app/api/cms/about-hero/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query("SELECT * FROM about_hero LIMIT 1");
  return NextResponse.json({ hero: result.rows[0] ?? null });
}