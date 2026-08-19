import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyToken } from "@/lib/auth-server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const decoded = verifyToken(token);

    const result = await pool.query(
      `UPDATE user_address SET is_deleted = true
       WHERE address_id = $1 AND user_id = $2
       RETURNING address_id`,
      [id, decoded.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete address error:", error);
    return NextResponse.json({ error: "Unable to delete address." }, { status: 500 });
  }
}