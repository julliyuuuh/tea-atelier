import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { adminQuery } from "@/lib/admin-audit";
export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    if (
      !body ||
      Object.keys(body).some(
        (k) =>
          !["firstName", "lastName", "phoneNumber", "avatarUrl"].includes(k),
      )
    )
      return NextResponse.json(
        { error: "Only your name, phone and photo can be edited here." },
        { status: 400 },
      );
    const { firstName, lastName, phoneNumber, avatarUrl } = body;
    if (
      ![firstName, lastName].every(
        (v) =>
          typeof v === "string" && v.trim().length > 0 && v.trim().length <= 50,
      ) ||
      typeof phoneNumber !== "string" ||
      (phoneNumber !== "" && !/^09\d{9}$/.test(phoneNumber))
    )
      return NextResponse.json(
        {
          error:
            "Enter your first/last name and a valid optional mobile number starting with 09.",
        },
        { status: 400 },
      );
    if (avatarUrl !== null) {
      if (typeof avatarUrl !== "string" || avatarUrl.length > 2048)
        return NextResponse.json(
          { error: "Invalid photo URL." },
          { status: 400 },
        );
      const url = new URL(avatarUrl);
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      if (
        url.protocol !== "https:" ||
        url.hostname !== "res.cloudinary.com" ||
        url.username ||
        url.password ||
        !cloud ||
        !url.pathname.startsWith(`/${cloud}/image/upload/`)
      )
        return NextResponse.json(
          { error: "Upload your photo using the image uploader." },
          { status: 400 },
        );
    }
    const { rows } = await adminQuery(
      auth.decoded.userId,
      `UPDATE users SET first_name=$1,last_name=$2,phone_number=$3,avatar_url=$4 WHERE user_id=$5 RETURNING first_name,last_name,phone_number,avatar_url`,
      [
        firstName.trim(),
        lastName.trim(),
        phoneNumber || null,
        avatarUrl,
        auth.decoded.userId,
      ],
    );
    const u = rows[0];
    return NextResponse.json({
      user: {
        firstName: u.first_name,
        lastName: u.last_name,
        name: `${u.first_name} ${u.last_name}`,
        phone: u.phone_number,
        avatarUrl: u.avatar_url,
      },
    });
  } catch (e) {
    if (e instanceof TypeError)
      return NextResponse.json(
        { error: "Invalid profile details." },
        { status: 400 },
      );
    if (e && typeof e === "object" && "code" in e && e.code === "23505")
      return NextResponse.json(
        { error: "That phone number is already in use." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Unable to save profile." },
      { status: 500 },
    );
  }
}
