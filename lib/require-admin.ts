import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";

export function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "admin") {
      return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
    }
    return { decoded };
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }) };
  }
}