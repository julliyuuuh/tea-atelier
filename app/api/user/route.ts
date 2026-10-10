import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function PATCH(req: Request) {
  try {
    // Verifies the token and rejects deleted or suspended accounts.
    const { userId, error } = await requireUser(req);
    if (error) return error;

    const { firstName, lastName, phoneNumber, avatarUrl } = await req.json();

    const validName = (value: unknown) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= 50;
    if (
      (firstName !== undefined && !validName(firstName)) ||
      (lastName !== undefined && !validName(lastName))
    ) {
      return NextResponse.json(
        { error: "Names must contain 1 to 50 characters." },
        { status: 400 },
      );
    }
    if (
      phoneNumber !== undefined &&
      phoneNumber !== null &&
      (typeof phoneNumber !== "string" ||
        (phoneNumber !== "" && !/^09\d{9}$/.test(phoneNumber)))
    ) {
      return NextResponse.json(
        { error: "Enter an 11-digit mobile number starting with 09." },
        { status: 400 },
      );
    }
    if (
      avatarUrl !== undefined &&
      avatarUrl !== null &&
      typeof avatarUrl !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid profile photo." },
        { status: 400 },
      );
    }

    // An avatar-only request (upload or removal) comes through as just
    // { avatarUrl }, so the name fields are only required when this is
    // a profile-details save.
    const isAvatarOnly =
      avatarUrl !== undefined &&
      firstName === undefined &&
      lastName === undefined;

    if (!isAvatarOnly && (!firstName || !lastName)) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 },
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (firstName !== undefined) {
      fields.push(`first_name = $${i++}`);
      values.push(firstName.trim());
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${i++}`);
      values.push(lastName.trim());
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
      return NextResponse.json(
        { error: "No fields to update." },
        { status: 400 },
      );
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE user_id = $${i}
       RETURNING user_id, first_name, last_name, email, phone_number, role, avatar_url`,
      values,
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
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "That phone number is already used by another account." },
        { status: 409 },
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 },
    );
  }
}
