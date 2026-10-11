import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { adminQuery } from "@/lib/admin-audit";
import {
  contactContentError,
  normalizeContactContent,
} from "@/lib/contact-content";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  try {
    const result = await pool.query(
      "SELECT content,version FROM contact_page WHERE id=1",
    );
    if (!result.rows[0]) throw new Error("Missing content");
    return NextResponse.json(result.rows[0], { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "Contact content is unavailable. Check that the Contact CMS migration has been run.",
      },
      { status: 503, headers },
    );
  }
}
export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["content", "version"].includes(key)) ||
    !Number.isSafeInteger(body.version) ||
    body.version < 1 ||
    body.version >= 2147483647
  )
    return NextResponse.json(
      { error: "Reload the Contact CMS page before saving." },
      { status: 400 },
    );
  const error = contactContentError(body.content);
  if (error) return NextResponse.json({ error }, { status: 400 });
  try {
    const result = await adminQuery(
      auth.decoded!.userId,
      "UPDATE contact_page SET content=$1::jsonb,version=version+1 WHERE id=1 AND version=$2 RETURNING content,version",
      [JSON.stringify(normalizeContactContent(body.content)), body.version],
    );
    if (!result.rows[0])
      return NextResponse.json(
        {
          error:
            "This content changed in another session. Reload before saving.",
        },
        { status: 409, headers },
      );
    return NextResponse.json(result.rows[0], { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to save Contact content. Check the migration and try again.",
      },
      { status: 500, headers },
    );
  }
}
