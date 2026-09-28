// app/api/cms/admin/privacy-intro/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { heading, intro, last_updated } = await req.json();

  const result = await pool.query(
    `UPDATE privacy_intro
     SET heading = $1, intro = $2, last_updated = $3
     WHERE id = (SELECT id FROM privacy_intro LIMIT 1)
     RETURNING *`,
    [heading, intro, last_updated]
  );

  return NextResponse.json({ intro: result.rows[0] });
}