import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { setAuditActor } from "@/lib/admin-audit";
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const url = new URL(req.url),
    status = url.searchParams.get("status") || "PENDING",
    page = Number(url.searchParams.get("page") || 1);
  if (
    !["PENDING", "APPROVED", "DECLINED", "REVOKED", "ALL"].includes(status) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  )
    return NextResponse.json({ error: "Invalid filter." }, { status: 400 });
  try {
    const values = [status];
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM business_applications WHERE ($1='ALL' OR status=$1)`,
      values,
    );
    const { rows } = await pool.query(
      `SELECT a.*,u.first_name,u.last_name,u.email FROM business_applications a JOIN users u ON u.user_id=a.user_id WHERE ($1='ALL' OR a.status=$1) ORDER BY a.created_at DESC,a.application_id DESC LIMIT 20 OFFSET $2`,
      [status, (page - 1) * 20],
    );
    return NextResponse.json(
      { applications: rows, total: count.rows[0].total },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load business requests." },
      { status: 503 },
    );
  }
}
export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  if (
    !body ||
    Object.keys(body).some(
      (k) => !["applicationId", "status", "message", "version"].includes(k),
    ) ||
    typeof body.applicationId !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.applicationId) ||
    !["APPROVED", "DECLINED", "REVOKED"].includes(body.status) ||
    !Number.isSafeInteger(body.version) ||
    body.version < 1 ||
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.trim().length > 1500
  )
    return NextResponse.json(
      { error: "Choose a decision and include a message (1–1500 characters)." },
      { status: 400 },
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    await setAuditActor(client, auth.decoded.userId);
    const owner = await client.query(
      "SELECT user_id FROM business_applications WHERE application_id=$1",
      [body.applicationId],
    );
    if (!owner.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }
    const user = await client.query(
      "SELECT role,is_suspended FROM users WHERE user_id=$1 FOR UPDATE",
      [owner.rows[0].user_id],
    );
    if (
      !user.rows[0] ||
      user.rows[0].role !== "customer" ||
      (user.rows[0].is_suspended && body.status === "APPROVED")
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "An active customer account is required." },
        { status: 409 },
      );
    }
    const expected = body.status === "REVOKED" ? "APPROVED" : "PENDING";
    const { rows } = await client.query(
      `UPDATE business_applications SET status=$1,admin_message=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now(),version=version+1 WHERE application_id=$4 AND version=$5 AND status=$6 RETURNING application_id`,
      [
        body.status,
        body.message.trim(),
        auth.decoded.userId,
        body.applicationId,
        body.version,
        expected,
      ],
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "This application changed. Refresh before reviewing." },
        { status: 409 },
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Unable to save the review." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
