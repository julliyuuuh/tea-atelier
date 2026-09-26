// app/api/contact/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await pool.query(
    `SELECT message_id, subject, message, status, admin_reply, created_at, replied_at, customer_viewed_at
     FROM contact_messages
     WHERE message_id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  let m = result.rows[0];

  if (!m.customer_viewed_at) {
    const updated = await pool.query(
      `UPDATE contact_messages SET customer_viewed_at = NOW()
       WHERE message_id = $1
       RETURNING message_id, subject, message, status, admin_reply, created_at, replied_at, customer_viewed_at`,
      [id]
    );
    m = updated.rows[0];
  }

  return NextResponse.json({
    id: m.message_id,
    subject: m.subject,
    message: m.message,
    status: m.status,
    adminReply: m.admin_reply,
    createdAt: m.created_at,
    repliedAt: m.replied_at,
    customerViewedAt: m.customer_viewed_at,
  });
}