import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { pool } from "@/lib/db";

const ADMIN_ROLES = ["admin", "super_admin"];

export function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  try {
    const decoded = verifyToken(token);
    if (!ADMIN_ROLES.includes(decoded.role)) {
      return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
    }
    return { decoded };
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }) };
  }
}

// Even more Strict (because super admin :D): also re-checks the DB so a demoted/deleted admin loses access immediately
export async function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "super_admin") {
      return { error: NextResponse.json({ error: "Super admins only." }, { status: 403 }) };
    }

    const { rows } = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [decoded.userId]
    );
    if (rows.length === 0 || rows[0].role !== "super_admin") {
      return { error: NextResponse.json({ error: "Super admins only." }, { status: 403 }) };
    }

    return { decoded };
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }) };
  }
}