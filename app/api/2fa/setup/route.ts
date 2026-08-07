import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userResult = await pool.query("SELECT email FROM users WHERE user_id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

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
  await pool.query("UPDATE users SET totp_secret = $1 WHERE user_id = $2", [secret.base32, userId]);

  const qrDataUrl = await QRCode.toDataURL(totp.toString());

  return NextResponse.json({ qrCode: qrDataUrl, secret: secret.base32 });
}