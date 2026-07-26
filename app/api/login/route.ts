import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

  return NextResponse.json({
    token,
    user: { name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role },
  });
}