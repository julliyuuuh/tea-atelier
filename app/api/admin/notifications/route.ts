import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  try {
    const { rows } = await pool.query(
      `SELECT e.event_id::text,e.title,e.href,e.created_at,(r.event_id IS NOT NULL) AS read FROM admin_events e LEFT JOIN admin_event_reads r ON r.event_id=e.event_id AND r.user_id=$1 ORDER BY e.created_at DESC,e.event_id DESC LIMIT 30`,
      [auth.decoded.userId],
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS count FROM admin_events e WHERE NOT EXISTS(SELECT 1 FROM admin_event_reads r WHERE r.event_id=e.event_id AND r.user_id=$1)`,
      [auth.decoded.userId],
    );
    return NextResponse.json(
      { items: rows, unread: count.rows[0].count },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to load admin notifications. Check the migration has been applied.",
      },
      { status: 500 },
    );
  }
}
export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    if (
      !body ||
      Object.keys(body).some((k) => !["eventId", "all"].includes(k)) ||
      !(
        (body.all === true && body.eventId === undefined) ||
        (typeof body.eventId === "string" &&
          /^[1-9]\d{0,17}$/.test(body.eventId) &&
          body.all === undefined)
      )
    )
      return NextResponse.json(
        { error: "Invalid notification selection." },
        { status: 400 },
      );
    await pool.query(
      `INSERT INTO admin_event_reads(user_id,event_id) SELECT $1,event_id FROM admin_events WHERE ($2::bigint IS NULL OR event_id=$2) ON CONFLICT DO NOTHING`,
      [auth.decoded.userId, body.all ? null : body.eventId],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }
}
