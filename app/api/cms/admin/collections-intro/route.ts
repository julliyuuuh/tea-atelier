// app/api/cms/admin/collections-intro/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { eyebrow, heading, subheading } = await req.json();

  const result = await pool.query(
    `UPDATE collections_intro
     SET eyebrow = $1, heading = $2, subheading = $3
     WHERE id = (SELECT id FROM collections_intro LIMIT 1)
     RETURNING *`,
    [eyebrow, heading, subheading]
  );

  return NextResponse.json({ intro: result.rows[0] });
}