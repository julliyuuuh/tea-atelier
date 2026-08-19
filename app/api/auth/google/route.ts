import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth-server";
import { sendWelcomeEmail } from "@/lib/email";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: "Missing Google credential." }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
    }

    const { email, given_name, family_name, sub: googleId, email_verified } = payload;

    if (!email_verified) {
      return NextResponse.json({ error: "Google email not verified." }, { status: 401 });
    }

    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    let user;

    if (existing.rows.length > 0) {
      // Existing account (password-based or previously Google), link automatically
      user = existing.rows[0];
      if (!user.google_id) {
        await pool.query("UPDATE users SET google_id = $1 WHERE user_id = $2", [googleId, user.user_id]);
      }
    } else {
      // Brand new account via Google, already email-verified by Google
      const result = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, google_id, is_verified)
         VALUES ($1, $2, $3, NULL, 'customer', $4, true)
         RETURNING user_id, first_name, last_name, email, role`,
        [given_name || "Google", family_name || "User", email, googleId]
      );
      user = result.rows[0];

      try {
        await sendWelcomeEmail(user.email, user.first_name);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail signup just because the email didn't send
      }
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "Administrators must sign in through the admin portal." }, { status: 403 });
    }

    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

    return NextResponse.json({
      token,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number || null,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Unable to sign in with Google." }, { status: 500 });
  }
}