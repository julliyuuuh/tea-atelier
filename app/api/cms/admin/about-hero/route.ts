// app/api/cms/admin/about-hero/route.ts
import { adminQuery } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { heading, subheading } = await req.json();

  const result = await adminQuery(
    decoded!.userId,
    `UPDATE about_hero
     SET heading = $1, subheading = $2
     WHERE id = (SELECT id FROM about_hero LIMIT 1)
     RETURNING *`,
    [heading, subheading],
  );

  if (!result.rows.length)
    return NextResponse.json(
      { error: "This content record no longer exists. Refresh and try again." },
      { status: 404 },
    );
  return NextResponse.json({ hero: result.rows[0] });
}
