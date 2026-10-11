import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const userResult = await pool.query(
    "SELECT email, is_verified FROM users WHERE user_id = $1",
    [userId],
  );
  const user = userResult.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.is_verified) {
    return NextResponse.json(
      { error: "Your email is already verified." },
      { status: 400 },
    );
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    "UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE user_id = $3",
    [verificationToken, tokenExpires, userId],
  );

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return NextResponse.json(
      { error: "Unable to send email. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
