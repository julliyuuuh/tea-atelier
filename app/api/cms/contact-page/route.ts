import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { DEFAULT_CONTACT_CONTENT } from "@/lib/contact-content";
export async function GET() {
  try {
    const result = await pool.query(
      "SELECT content FROM contact_page WHERE id=1",
    );
    return NextResponse.json(
      { content: result.rows[0]?.content ?? DEFAULT_CONTACT_CONTENT },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { content: DEFAULT_CONTACT_CONTENT },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
