import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { pool } from "@/lib/db";

const ADMIN_ROLES = ["admin", "super_admin"];

async function authorize(req: Request, allowedRoles: string[], deniedMessage: string) {
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
    // The JWT's role can be stale, so trust the database instead.
    const { rows } = await pool.query("SELECT role FROM users WHERE user_id = $1", [
      decoded.userId,
    ]);

    if (rows.length === 0) {
      return { error: NextResponse.json({ error: "Account no longer exists." }, { status: 401 }) };
    }

    const currentRole: string = rows[0].role;
    if (!allowedRoles.includes(currentRole)) {
      return { error: NextResponse.json({ error: deniedMessage }, { status: 403 }) };
    }

    return { decoded: { ...decoded, role: currentRole } };
  } catch (err) {
    console.error("Auth role check failed:", err);
    return { error: NextResponse.json({ error: "Unable to verify access." }, { status: 500 }) };
  }
}

export const requireAdmin = (req: Request) =>
  authorize(req, ADMIN_ROLES, "Admins only.");

// Even more Strict (because super admin :D): also re-checks the DB so a demoted/deleted admin loses access immediately
export const requireSuperAdmin = (req: Request) =>
  authorize(req, ["super_admin"], "Super admins only.");