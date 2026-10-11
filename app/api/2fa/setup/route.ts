import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const userResult = await pool.query(
    "SELECT email, totp_enabled FROM users WHERE user_id = $1",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (user.totp_enabled)
    return NextResponse.json(
      { error: "Two-factor authentication is already enabled." },
      { status: 409 },
    );

  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer: "Tea Atelier",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  // Store the secret now, but don't enable 2FA until they confirm with a valid code
  const updated = await pool.query(
    "UPDATE users SET totp_secret = $1 WHERE user_id = $2 AND totp_enabled = false AND is_suspended = false RETURNING user_id",
    [secret.base32, userId],
  );

  if (!updated.rows.length)
    return NextResponse.json(
      { error: "Your security settings changed. Refresh and try again." },
      { status: 409 },
    );

  const qrDataUrl = await QRCode.toDataURL(totp.toString());

  return NextResponse.json({ qrCode: qrDataUrl, secret: secret.base32 });
}
