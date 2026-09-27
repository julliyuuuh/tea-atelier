import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const body = await req.json();
  const {
    volume_label,
    eyebrow,
    heading,
    subheading,
    cta_text,
    cta_link,
    image_url,
    image_caption,
  } = body;

  const result = await pool.query(
    `UPDATE homepage_hero
     SET volume_label = $1, eyebrow = $2, heading = $3, subheading = $4,
         cta_text = $5, cta_link = $6, image_url = $7, image_caption = $8
     WHERE id = (SELECT id FROM homepage_hero LIMIT 1)
     RETURNING *`,
    [volume_label, eyebrow, heading, subheading, cta_text, cta_link, image_url, image_caption]
  );

  return NextResponse.json({ hero: result.rows[0] });
}