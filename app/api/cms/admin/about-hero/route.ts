// app/api/cms/admin/about-hero/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { heading, subheading } = await req.json();

  const result = await pool.query(
    `UPDATE about_hero
     SET heading = $1, subheading = $2
     WHERE id = (SELECT id FROM about_hero LIMIT 1)
     RETURNING *`,
    [heading, subheading]
  );

  return NextResponse.json({ hero: result.rows[0] });
}