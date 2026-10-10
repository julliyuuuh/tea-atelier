import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function GET(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  try {
    // One statement gives a consistent unread count and bounded recent list.
    const { rows } = await pool.query(
      `SELECT (SELECT count(*)::integer FROM notifications WHERE user_id = $1 AND read_at IS NULL) AS unread_count,
        COALESCE((SELECT jsonb_agg(item ORDER BY item.created_at DESC, item.notification_id DESC)
          FROM (SELECT notification_id, order_id, title, message, created_at, read_at
            FROM notifications WHERE user_id = $1
            ORDER BY created_at DESC, notification_id DESC LIMIT 30) item), '[]'::jsonb) AS notifications`,
      [userId],
    );
    return NextResponse.json(
      {
        notifications: rows[0].notifications,
        unreadCount: rows[0].unread_count,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  const body = await req.json().catch(() => null);
  const id = body?.notificationId;
  const all = body?.all === true;
  if (
    (!all &&
      (typeof id !== "string" ||
        !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) ||
    (all && id !== undefined)
  ) {
    return NextResponse.json(
      { error: "Choose a notification or mark all as read." },
      { status: 400 },
    );
  }
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now())
       WHERE user_id = $1 AND ($2::uuid IS NULL OR notification_id = $2)
       RETURNING notification_id`,
      [userId, all ? null : id],
    );
    if (!all && !rows.length)
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }
}
