import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await pool.query("SELECT totp_enabled FROM users WHERE user_id = $1", [userId]);
  const user = result.rows[0];

  return NextResponse.json({ enabled: user?.totp_enabled || false });
}