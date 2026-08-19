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
    const { firstName, lastName, phoneNumber } = await req.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, phone_number = $3
       WHERE user_id = $4
       RETURNING user_id, first_name, last_name, email, phone_number, role`,
      [firstName, lastName, phoneNumber || null, decoded.userId]
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
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}