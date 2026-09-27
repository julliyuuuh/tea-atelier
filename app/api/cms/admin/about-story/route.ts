// app/api/cms/admin/about-story/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { eyebrow, heading, paragraph_1, paragraph_2, image_url } = await req.json();

  const result = await pool.query(
    `UPDATE about_story
     SET eyebrow = $1, heading = $2, paragraph_1 = $3, paragraph_2 = $4, image_url = $5
     WHERE id = (SELECT id FROM about_story LIMIT 1)
     RETURNING *`,
    [eyebrow, heading, paragraph_1, paragraph_2, image_url]
  );

  return NextResponse.json({ story: result.rows[0] });
}