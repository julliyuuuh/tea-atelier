import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT user_id, verification_token_expires FROM users WHERE verification_token = $1`,
    [token]
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "Invalid verification link." }, { status: 400 });
  }

  if (new Date(user.verification_token_expires) < new Date()) {
    return NextResponse.json({ error: "This verification link has expired." }, { status: 400 });
  }

  await pool.query(
    `UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE user_id = $1`,
    [user.user_id]
  );

  return NextResponse.json({ success: true });
}