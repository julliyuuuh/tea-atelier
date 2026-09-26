import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

const SUBJECT_MAX_LENGTH = 255;
const MESSAGE_MAX_LENGTH = 5000;

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 4;
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(
    "SELECT COUNT(*) FROM contact_messages WHERE user_id = $1",
    [userId]
  );
  const totalMessages = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalMessages / pageSize);

  const messagesResult = await pool.query(
    `SELECT message_id, subject, message, status, admin_reply, created_at, replied_at, customer_viewed_at
    FROM contact_messages
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );

  const messages = messagesResult.rows.map((m) => ({
    id: m.message_id,
    subject: m.subject,
    message: m.message,
    status: m.status,
    adminReply: m.admin_reply,
    createdAt: m.created_at,
    repliedAt: m.replied_at,
    customerViewedAt: m.customer_viewed_at,
  }));
  
  return NextResponse.json({ messages, totalPages, currentPage: page });
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subject, message } = await req.json();

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length > 255) {
      return NextResponse.json({ error: "Subject must be under 255 characters." }, { status: 400 });
    }
    if (trimmedMessage.length > 5000) {
      return NextResponse.json({ error: "Message must be under 5000 characters." }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (user_id, subject, message)
       VALUES ($1, $2, $3)
       RETURNING message_id, subject, message, status, created_at`,
      [userId, trimmedSubject, trimmedMessage]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/contact failed:", err);
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}