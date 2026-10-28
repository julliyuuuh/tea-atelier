import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import { getPasswordError } from "@/lib/password-policy";
import { limitAuthRequest, limitAuthAccount } from "@/lib/auth-rate-limit";

export async function POST(req: Request) {
  const requestLimit = await limitAuthRequest(req, "reset");
  if (requestLimit) return requestLimit;
  const body = await req.json().catch(() => null);
  const { token, newPassword } = body || {};

  if (typeof token !== "string" || !token || token.length > 256) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const passwordError = getPasswordError(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const accountLimit = await limitAuthAccount("reset", token);
  if (accountLimit) return accountLimit;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { rows } = await pool.query(
    "SELECT user_id, reset_token_expires FROM users WHERE reset_token_hash = $1",
    [tokenHash],
  );

  if (rows.length === 0 || new Date(rows[0].reset_token_expires) < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE user_id = $2",
    [passwordHash, rows[0].user_id],
  );

  return NextResponse.json({ message: "Password updated successfully." });
}
