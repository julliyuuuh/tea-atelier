import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth-server";

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

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING user_id, first_name, last_name, email, role`,
      [firstName, lastName, email, phoneNumber || null, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

    return NextResponse.json({
      token,
      user: { name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}