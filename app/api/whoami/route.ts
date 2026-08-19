import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyToken } from "@/lib/auth-server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);

    const result = await pool.query(
      "SELECT user_id, first_name, last_name, email, role, phone_number, is_verified FROM users WHERE user_id = $1",
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone_number,
        isVerified: user.is_verified,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
}