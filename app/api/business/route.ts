import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { readSettings } from "@/lib/store-settings-server";
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    const { rows } = await pool.query(
      "SELECT business_approved FROM users WHERE user_id=$1",
      [auth.userId],
    );
    const app = await pool.query(
      `SELECT application_id,business_name,business_type,contact_details,registration_number,purchase_plan,status,admin_message,created_at,reviewed_at,version FROM business_applications WHERE user_id=$1 ORDER BY created_at DESC,application_id DESC LIMIT 1`,
      [auth.userId],
    );
    const { config } = await readSettings();
    return NextResponse.json(
      {
        approved: rows[0]?.business_approved === true,
        application: app.rows[0] ?? null,
        limits: config.purchaseLimits,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load business purchasing. Please try again." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const fields = {
    business_name: 150,
    business_type: 100,
    contact_details: 300,
    registration_number: 100,
    purchase_plan: 1500,
  };
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !Object.hasOwn(fields, k)) ||
    Object.entries(fields).some(
      ([k, max]) =>
        typeof body[k] !== "string" ||
        body[k].trim().length < (k === "purchase_plan" ? 10 : 1) ||
        body[k].trim().length > max,
    )
  )
    return NextResponse.json(
      {
        error:
          "Complete the business details and describe your purchasing plans (10–1500 characters).",
      },
      { status: 400 },
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    const { rows } = await client.query(
      "SELECT role,is_suspended,business_approved FROM users WHERE user_id=$1 FOR UPDATE",
      [auth.userId],
    );
    if (
      !rows[0] ||
      rows[0].role !== "customer" ||
      rows[0].is_suspended ||
      rows[0].business_approved
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Only active customers without business approval can apply." },
        { status: 403 },
      );
    }
    const result = await client.query(
      `INSERT INTO business_applications(user_id,business_name,business_type,contact_details,registration_number,purchase_plan) VALUES($1,$2,$3,$4,$5,$6) RETURNING application_id`,
      [auth.userId, ...Object.keys(fields).map((k) => body[k].trim())],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { applicationId: result.rows[0].application_id },
      { status: 201 },
    );
  } catch (e) {
    await client.query("ROLLBACK");
    const duplicate =
      !!e && typeof e === "object" && "code" in e && e.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "You already have an application under review."
          : "Unable to submit your application.",
      },
      { status: duplicate ? 409 : 500 },
    );
  } finally {
    client.release();
  }
}
