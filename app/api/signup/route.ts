import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth-server";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phoneNumber, password } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    if (phoneNumber) {
      const existingPhone = await pool.query(
        "SELECT user_id FROM users WHERE phone_number = $1",
        [phoneNumber]
      );
      if (existingPhone.rows.length > 0) {
        return NextResponse.json({ error: "An account with this phone number already exists." }, { status: 409 });
      }
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, verification_token, verification_token_expires)
      VALUES ($1, $2, $3, $4, $5, 'customer', $6, $7)
      RETURNING user_id, first_name, last_name, email, phone_number, role`,
      [firstName, lastName, email, phoneNumber || null, passwordHash, verificationToken, tokenExpires]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail the whole signup just because the email didn't send
    }

    return NextResponse.json({
      token,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}