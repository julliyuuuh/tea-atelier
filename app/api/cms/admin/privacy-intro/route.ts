// app/api/cms/admin/privacy-intro/route.ts
import { adminQuery } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { heading, intro, last_updated } = await req.json();

  const result = await adminQuery(
    decoded!.userId,
    `UPDATE privacy_intro
     SET heading = $1, intro = $2, last_updated = $3
     WHERE id = (SELECT id FROM privacy_intro LIMIT 1)
     RETURNING *`,
    [heading, intro, last_updated],
  );

  return NextResponse.json({ intro: result.rows[0] });
}
