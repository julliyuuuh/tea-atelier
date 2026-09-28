// app/api/cms/admin/about-team/route.ts
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await pool.query("SELECT * FROM about_team ORDER BY sort_order ASC");
  return NextResponse.json({ team: result.rows });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { name, role, image, sort_order } = await req.json();

  const result = await pool.query(
    `INSERT INTO about_team (name, role, image, sort_order)
     VALUES ($1, $2, $3, COALESCE($4, 0))
     RETURNING *`,
    [name, role, image, sort_order]
  );

  return NextResponse.json({ member: result.rows[0] }, { status: 201 });
}