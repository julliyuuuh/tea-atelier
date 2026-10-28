import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { limitAuthRequest, limitAuthAccount, normalizeAuthEmail } from "@/lib/auth-rate-limit";

export async function POST(req: Request) {
  const requestLimit = await limitAuthRequest(req, "forgot");
  if (requestLimit) return requestLimit;
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeAuthEmail(body?.email);
    if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const accountLimit = await limitAuthAccount("forgot", email);
    if (accountLimit) return accountLimit;

    const genericResponse = NextResponse.json({
      message: "If an account exists for that email, a reset link has been sent.",
    });

    const { rows } = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (rows.length === 0) {
    // Same response either way to not reveal whether the email exists
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE user_id = $3",
      [tokenHash, expires, rows[0].user_id]
    );

    await sendPasswordResetEmail(email, rawToken);

    return genericResponse;
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
