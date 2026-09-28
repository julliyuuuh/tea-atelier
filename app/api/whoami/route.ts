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
      "SELECT user_id, first_name, last_name, email, role, phone_number, is_verified, is_suspended, avatar_url FROM users WHERE user_id = $1",
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // The frontend's AuthProvider clears the session and shows this message.
    if (user.is_suspended) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      );
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
        avatarUrl: user.avatar_url,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
}