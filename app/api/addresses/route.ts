import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyToken } from "@/lib/auth-server";

function getUserId(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT address_id, address_line1, address_line2, address_line3, default_address, default_billing
     FROM user_address
     WHERE user_id = $1 AND is_deleted = false
     ORDER BY default_address DESC, address_id ASC`,
    [userId]
  );

  return NextResponse.json({ addresses: rows });
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { addressLine1, addressLine2, addressLine3 } = await req.json();

    if (!addressLine1?.trim()) {
      return NextResponse.json({ error: "Address line 1 is required." }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, default_address, default_billing, is_deleted)
       VALUES ($1, $2, $3, $4, false, false, false)
       RETURNING address_id, address_line1, address_line2, address_line3, default_address, default_billing`,
      [userId, addressLine1.trim(), addressLine2?.trim() || null, addressLine3?.trim() || null]
    );

    return NextResponse.json({ address: result.rows[0] });
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json({ error: "Unable to save address." }, { status: 500 });
  }
}