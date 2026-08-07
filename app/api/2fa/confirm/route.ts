import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import * as OTPAuth from "otpauth";

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });

  const userResult = await pool.query("SELECT totp_secret FROM users WHERE user_id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user?.totp_secret) {
    return NextResponse.json({ error: "No pending 2FA setup found." }, { status: 400 });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Tea Atelier",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totp_secret),
  });

  const delta = totp.validate({ token: code, window: 1 });

  if (delta === null) {
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
  }

  await pool.query("UPDATE users SET totp_enabled = true WHERE user_id = $1", [userId]);

  return NextResponse.json({ success: true });
}