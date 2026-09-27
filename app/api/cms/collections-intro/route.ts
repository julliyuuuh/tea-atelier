// app/api/cms/collections-intro/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query("SELECT * FROM collections_intro LIMIT 1");
  return NextResponse.json({ intro: result.rows[0] ?? null });
}