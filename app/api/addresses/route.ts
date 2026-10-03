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

  // Only addresses the customer chose to keep. Rows created just to ship an
  // order have is_saved = false and stay out of the profile list.
  const { rows } = await pool.query(
    `SELECT address_id, address_line1, address_line2, address_line3, default_address, default_billing
     FROM user_address
     WHERE user_id = $1 AND is_deleted = false AND is_saved = true
     ORDER BY default_address DESC, address_id ASC`,
    [userId]
  );

  return NextResponse.json({ addresses: rows });
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = await req.json();

    let line1: string;
    let line2: string | null;
    let line3: string | null = null;
    let barangay: string | null = null;

    if (body.street !== undefined) {
      // Structured address from the province / city / barangay dropdowns
      const street = String(body.street ?? "").trim();
      const city = String(body.city ?? "").trim();
      const province = String(body.province ?? "").trim();
      if (!street || !city || !province) {
        return NextResponse.json(
          { error: "Street, city and province are required." },
          { status: 400 }
        );
      }
      barangay = body.barangay ? String(body.barangay).trim() : null;
      line1 = street;
      line2 = [...new Set([barangay, city, province].filter(Boolean))].join(", ");
    } else {
      // Free-text lines, kept for older clients (e.g. the mobile app)
      if (!body.addressLine1?.trim()) {
        return NextResponse.json({ error: "Address line 1 is required." }, { status: 400 });
      }
      line1 = body.addressLine1.trim();
      line2 = body.addressLine2?.trim() || null;
      line3 = body.addressLine3?.trim() || null;
    }

    // If this user already has an identical address (say, from a past order),
    // flag that row as saved instead of creating a duplicate.
    const existing = await pool.query(
      `UPDATE user_address SET is_saved = true
       WHERE address_id = (
         SELECT address_id FROM user_address
         WHERE user_id = $1
           AND address_line1 = $2
           AND address_line2 IS NOT DISTINCT FROM $3
           AND address_line3 IS NOT DISTINCT FROM $4
           AND is_deleted IS NOT TRUE
         LIMIT 1
       )
       RETURNING address_id, address_line1, address_line2, address_line3, default_address, default_billing`,
      [userId, line1, line2, line3]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ address: existing.rows[0] });
    }

    const result = await pool.query(
      `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, barangay, default_address, default_billing, is_deleted, is_saved)
       VALUES ($1, $2, $3, $4, $5, false, false, false, true)
       RETURNING address_id, address_line1, address_line2, address_line3, default_address, default_billing`,
      [userId, line1, line2, line3, barangay]
    );

    return NextResponse.json({ address: result.rows[0] });
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json({ error: "Unable to save address." }, { status: 500 });
  }
}