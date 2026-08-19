import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { rows } = await pool.query(
    "SELECT user_id, reset_token_expires FROM users WHERE reset_token_hash = $1",
    [tokenHash]
  );

  if (rows.length === 0 || new Date(rows[0].reset_token_expires) < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE user_id = $2",
    [passwordHash, rows[0].user_id]
  );

  return NextResponse.json({ message: "Password updated successfully." });
}