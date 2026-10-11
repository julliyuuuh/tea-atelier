import { adminQuery } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const { label, heading, image_url, cta_text, cta_link } = body;

  const result = await adminQuery(
    decoded!.userId,
    `UPDATE homepage_promo
     SET label = $1, heading = $2, image_url = $3, cta_text = $4, cta_link = $5
     WHERE id = (SELECT id FROM homepage_promo LIMIT 1)
     RETURNING *`,
    [label, heading, image_url, cta_text, cta_link],
  );

  if (!result.rows.length)
    return NextResponse.json(
      { error: "This content record no longer exists. Refresh and try again." },
      { status: 404 },
    );
  return NextResponse.json({ promo: result.rows[0] });
}
