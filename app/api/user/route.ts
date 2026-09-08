import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyToken } from "@/lib/auth-server";

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const decoded = verifyToken(token); // should return { userId, email, role } or throw
    const { firstName, lastName, phoneNumber, avatarUrl } = await req.json();

    // An avatar-only request (upload or removal) comes through as just
    // { avatarUrl }, so the name fields are only required when this is
    // a profile-details save.
    const isAvatarOnly =
      avatarUrl !== undefined && firstName === undefined && lastName === undefined;

    if (!isAvatarOnly && (!firstName || !lastName)) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (firstName !== undefined) {
      fields.push(`first_name = $${i++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${i++}`);
      values.push(lastName);
    }
    if (phoneNumber !== undefined) {
      fields.push(`phone_number = $${i++}`);
      values.push(phoneNumber || null);
    }
    if (avatarUrl !== undefined) {
      fields.push(`avatar_url = $${i++}`);
      values.push(avatarUrl); // null clears it
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(decoded.userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE user_id = $${i}
       RETURNING user_id, first_name, last_name, email, phone_number, role, avatar_url`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}