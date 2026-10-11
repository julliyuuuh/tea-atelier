// app/api/cms/admin/about-story/route.ts
import { adminQuery } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { eyebrow, heading, paragraph_1, paragraph_2, image_url } =
    await req.json();

  const result = await adminQuery(
    decoded!.userId,
    `UPDATE about_story
     SET eyebrow = $1, heading = $2, paragraph_1 = $3, paragraph_2 = $4, image_url = $5
     WHERE id = (SELECT id FROM about_story LIMIT 1)
     RETURNING *`,
    [eyebrow, heading, paragraph_1, paragraph_2, image_url],
  );

  if (!result.rows.length)
    return NextResponse.json(
      { error: "This content record no longer exists. Refresh and try again." },
      { status: 404 },
    );
  return NextResponse.json({ story: result.rows[0] });
}
