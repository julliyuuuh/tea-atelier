// app/api/admin/contact/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { sendContactReplyEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  if (body.action === "read") {
    const result = await pool.query(
      `UPDATE contact_messages
       SET status = 'read'
       WHERE message_id = $1 AND status = 'new'
       RETURNING message_id, subject, message, status, admin_reply, created_at, replied_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Message not found or already actioned." }, { status: 404 });
    }

    const m = result.rows[0];
    return NextResponse.json({
      id: m.message_id,
      subject: m.subject,
      message: m.message,
      status: m.status,
      adminReply: m.admin_reply,
      createdAt: m.created_at,
      repliedAt: m.replied_at,
    });
  }

  if (body.action === "reply") {
    const { adminReply } = body;

    if (!adminReply || typeof adminReply !== "string" || !adminReply.trim()) {
      return NextResponse.json({ error: "Reply is required." }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE contact_messages
       SET admin_reply = $1, status = 'replied', replied_at = NOW()
       WHERE message_id = $2
       RETURNING message_id, subject, message, status, admin_reply, replied_at,
         (SELECT email FROM users WHERE user_id = contact_messages.user_id) AS user_email,
         (SELECT first_name FROM users WHERE user_id = contact_messages.user_id) AS user_first_name`,
      [adminReply.trim(), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const updated = result.rows[0];

    await sendContactReplyEmail(
      updated.user_email,
      updated.user_first_name,
      updated.subject,
      updated.message,
      updated.admin_reply
    );

    return NextResponse.json({
      id: updated.message_id,
      subject: updated.subject,
      message: updated.message,
      status: updated.status,
      adminReply: updated.admin_reply,
      repliedAt: updated.replied_at,
    });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}