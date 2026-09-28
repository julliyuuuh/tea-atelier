import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { pool } from "@/lib/db";

// Same shape as requireAdmin: returns { error } to send back, or { userId }.
// The JWT alone can be stale, so trust the database for suspended/deleted accounts.
export async function requireUser(req: Request) {
  const token = req.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  let decoded: ReturnType<typeof verifyToken>;
  try {
    decoded = verifyToken(token);
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }) };
  }

  try {
    const { rows } = await pool.query(
      "SELECT is_suspended FROM users WHERE user_id = $1",
      [decoded.userId]
    );

    if (rows.length === 0) {
      return { error: NextResponse.json({ error: "Account no longer exists." }, { status: 401 }) };
    }

    if (rows[0].is_suspended) {
      return {
        error: NextResponse.json(
          { error: "Your account has been suspended. Please contact support." },
          { status: 403 }
        ),
      };
    }

    return { userId: decoded.userId as number };
  } catch (err) {
    console.error("User auth check failed:", err);
    return { error: NextResponse.json({ error: "Unable to verify access." }, { status: 500 }) };
  }
}