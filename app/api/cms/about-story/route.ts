// app/api/cms/about-story/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query("SELECT * FROM about_story LIMIT 1");
  return NextResponse.json({ story: result.rows[0] ?? null });
}