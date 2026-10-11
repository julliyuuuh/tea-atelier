import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import * as OTPAuth from "otpauth";

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const { code } = (await req.json().catch(() => null)) || {};
  if (typeof code !== "string" || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Code is required." }, { status: 400 });

  const userResult = await pool.query(
    "SELECT totp_secret, totp_enabled FROM users WHERE user_id = $1",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user?.totp_secret) {
    return NextResponse.json(
      { error: "No pending 2FA setup found." },
      { status: 400 },
    );
  }

  if (user.totp_enabled)
    return NextResponse.json(
      { error: "Two-factor authentication is already enabled." },
      { status: 409 },
    );

  const totp = new OTPAuth.TOTP({
    issuer: "Tea Atelier",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totp_secret),
  });

  const delta = totp.validate({ token: code, window: 1 });

  if (delta === null) {
    return NextResponse.json(
      { error: "Invalid code. Please try again." },
      { status: 400 },
    );
  }

  const updated = await pool.query(
    "UPDATE users SET totp_enabled = true WHERE user_id = $1 AND totp_secret = $2 AND totp_enabled = false AND is_suspended = false RETURNING user_id",
    [userId, user.totp_secret],
  );
  if (!updated.rows.length)
    return NextResponse.json(
      { error: "Your security settings changed. Refresh and try again." },
      { status: 409 },
    );

  return NextResponse.json({ success: true });
}
