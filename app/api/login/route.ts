import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth-server";
import * as OTPAuth from "otpauth";
import { limitAuthRequest, limitAuthAccount, normalizeAuthEmail } from "@/lib/auth-rate-limit";

export async function POST(req: Request) {
  const requestLimit = await limitAuthRequest(req, "login");
  if (requestLimit) return requestLimit;
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = normalizeAuthEmail(body?.email);
  const password = body?.password;
  const totpCode = body?.totpCode;

  if (!email || typeof password !== "string" || !password || password.length > 1024 ||
      (totpCode !== undefined && (typeof totpCode !== "string" || !/^\d{6}$/.test(totpCode)))) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const accountLimit = await limitAuthAccount("login", email);
  if (accountLimit) return accountLimit;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    // Do the same bcrypt work for missing and Google-only accounts.
    const validPassword = await verifyPassword(password, user?.password_hash ||
      "$2b$10$mvdiK3cnaVdYRA1AeBxefelBTA7ptgK9p44IN1.6wyTVgGyZ/p/Om");
    if (!user?.password_hash || !validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Checked only after the password is verified, so someone who doesn't know
    // the password can't use this to find out which accounts are suspended.
    if (user.is_suspended) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 },
      );
    }

    if (user.totp_enabled) {
      if (!totpCode) {
        return NextResponse.json({ requiresTotp: true }, { status: 200 });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Tea Atelier",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totp_secret),
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        return NextResponse.json(
          { error: "Invalid authentication code." },
          { status: 401 },
        );
      }
    }

    const token = signToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone_number || null,
        isVerified: !!user.is_verified,
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch {
    console.error("Password sign-in unavailable.");
    return NextResponse.json({ error: "Unable to sign in. Please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
