import { AUDIT_RESOURCES, type AuditEvent } from "@/lib/admin-audit-types";
import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "@/lib/db";
export class AuditError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function setAuditActor(client: PoolClient, actorId: number) {
  const actor = (
    await client.query(
      `SELECT user_id,first_name,last_name,email,role FROM users WHERE user_id=$1 AND role IN ('admin','super_admin') AND is_suspended=false FOR SHARE`,
      [actorId],
    )
  ).rows[0];
  if (!actor) throw new AuditError("Active admin access is required.", 403);
  await client.query("SELECT set_config('tea.audit_actor',$1,true)", [
    JSON.stringify({
      id: actor.user_id,
      name:
        [actor.first_name, actor.last_name].filter(Boolean).join(" ") ||
        "Admin",
      email: actor.email || "",
      role: actor.role,
    }),
  ]);
}
// Each mutation and its database-trigger audit entries share one transaction/connection.
export async function adminQuery<T extends QueryResultRow = QueryResultRow>(
  actorId: number,
  sql: string,
  values?: unknown[],
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await setAuditActor(client, actorId);
    const result = await client.query<T>(sql, values);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function day(value: string, end: boolean) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AuditError("Invalid date.");
  const date = new Date(value + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new AuditError("Invalid date.");
  const instant = new Date(value + "T00:00:00+08:00");
  if (end) instant.setUTCDate(instant.getUTCDate() + 1);
  return instant.toISOString();
}
export async function listAudit(url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1),
    search = (url.searchParams.get("search") || "").trim(),
    type = url.searchParams.get("type") || "";
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    search.length > 100 ||
    (type && !Object.hasOwn(AUDIT_RESOURCES, type))
  )
    throw new AuditError("Invalid search, filter or page.");
  const from = day(url.searchParams.get("from") || "", false),
    to = day(url.searchParams.get("to") || "", true);
  if (from && to && from >= to)
    throw new AuditError("End date must be on or after start date.");
  const pattern = search ? `%${search.replace(/[\\%_]/g, "\\$&")}%` : null;
  const filters = [type || null, pattern, from, to];
  const where = `($1::text IS NULL OR resource_type=$1) AND ($2::text IS NULL OR actor_name ILIKE $2 OR actor_email ILIKE $2 OR resource_id ILIKE $2 OR action ILIKE $2 OR table_name ILIKE $2 OR before_data->>'order_id' ILIKE $2 OR after_data->>'order_id' ILIKE $2 OR (resource_type='order' AND ('TA-'||resource_id ILIKE $2 OR '#TA-'||resource_id ILIKE $2)))
    AND ($3::timestamptz IS NULL OR created_at >= $3) AND ($4::timestamptz IS NULL OR created_at < $4)`;
  const result = (
    await pool.query(
      `WITH matching AS (SELECT * FROM admin_audit_events WHERE ${where}), recent AS (SELECT event_id::text,actor_id,actor_name,actor_email,actor_role,origin,action,resource_type,resource_id,table_name,before_data,after_data,created_at FROM matching ORDER BY created_at DESC,event_id::bigint DESC LIMIT 25 OFFSET $5)
    SELECT (SELECT COALESCE(json_agg(recent ORDER BY created_at DESC,event_id::bigint DESC),'[]'::json) FROM recent) AS events,(SELECT count(*)::integer FROM matching) AS total`,
      [...filters, (page - 1) * 25],
    )
  ).rows[0];
  return {
    events: result.events as AuditEvent[],
    total: result.total,
    page,
    totalPages: Math.max(1, Math.ceil(result.total / 25)),
  };
}
