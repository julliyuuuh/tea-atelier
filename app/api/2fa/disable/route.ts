import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await pool.query(
    "UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE user_id = $1",
    [userId]
  );

  return NextResponse.json({ success: true });
}