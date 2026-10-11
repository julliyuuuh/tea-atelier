import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function GET(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const result = await pool.query(
    "SELECT totp_enabled FROM users WHERE user_id = $1",
    [userId],
  );
  const user = result.rows[0];

  if (!user)
    return NextResponse.json(
      { error: "Account no longer exists." },
      { status: 404 },
    );
  return NextResponse.json({ enabled: !!user.totp_enabled });
}
