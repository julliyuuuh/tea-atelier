import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { rows } = await pool.query(
      `SELECT user_id, first_name, last_name, email, role,
              date_created AS created_at
       FROM users
       WHERE role IN ('admin', 'super_admin')
       ORDER BY role DESC, date_created ASC`
    );
    return NextResponse.json({ accounts: rows });
  } catch (err) {
    console.error("GET /api/admin/accounts failed:", err);
    return NextResponse.json({ error: "Unable to load accounts." }, { status: 500 });
  }
}
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  const { firstName, lastName, email, password } = await req.json();

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query("SELECT 1 FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, $4, 'admin', true)
     RETURNING user_id, first_name, last_name, email, role, date_created AS created_at`,
    [firstName.trim(), lastName.trim(), normalizedEmail, passwordHash]
  );
  return NextResponse.json({ account: rows[0] }, { status: 201 });
}