import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;

  const updated = await pool.query(
    "UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE user_id = $1 AND is_suspended = false RETURNING user_id",
    [userId],
  );

  if (!updated.rows.length)
    return NextResponse.json(
      { error: "Your security settings changed. Refresh and try again." },
      { status: 409 },
    );
  return NextResponse.json({ success: true });
}
