// app/api/admin/contact/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    params.push(status);
    conditions.push(`cm.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR cm.subject ILIKE $${idx})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM contact_messages cm
     JOIN users u ON u.user_id = cm.user_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const messagesResult = await pool.query(
    `SELECT cm.message_id, cm.subject, cm.message, cm.status, cm.admin_reply,
            cm.created_at, cm.replied_at, u.first_name, u.last_name, u.email
     FROM contact_messages cm
     JOIN users u ON u.user_id = cm.user_id
     ${whereClause}
     ORDER BY cm.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const messages = messagesResult.rows.map((m) => ({
    id: m.message_id,
    subject: m.subject,
    message: m.message,
    status: m.status,
    adminReply: m.admin_reply,
    createdAt: m.created_at,
    repliedAt: m.replied_at,
    customerName: `${m.first_name} ${m.last_name}`.trim(),
    customerEmail: m.email,
  }));

  // Stats stay global, independent of the current search/status filter —
  // same convention as the customers page's stat chips.
  const statsResult = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'new') AS new,
       COUNT(*) FILTER (WHERE status = 'replied') AS replied
     FROM contact_messages`
  );
  const statsRow = statsResult.rows[0];

  return NextResponse.json({
    messages,
    total,
    totalPages,
    currentPage: page,
    stats: {
      total: parseInt(statsRow.total, 10),
      new: parseInt(statsRow.new, 10),
      replied: parseInt(statsRow.replied, 10),
    },
  });
}