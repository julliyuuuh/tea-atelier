import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-admin";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isPgError = (err: unknown, code: string) =>
  typeof err === "object" && err !== null && (err as { code?: string }).code === code;

async function getManageableAdmin(id: string) {
  if (!/^\d+$/.test(id)) {
    return { error: NextResponse.json({ error: "Invalid account id." }, { status: 400 }) };
  }
  const { rows } = await pool.query("SELECT user_id, role FROM users WHERE user_id = $1", [id]);
  if (rows.length === 0) {
    return { error: NextResponse.json({ error: "Account not found." }, { status: 404 }) };
  }
  if (rows[0].role !== "admin") {
    return { error: NextResponse.json({ error: "Only admin accounts can be managed here." }, { status: 403 }) };
  }
  return { target: rows[0] };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const check = await getManageableAdmin(id);
    if (check.error) return check.error;

    const body = await req.json();
    const firstName = str(body.firstName);
    const lastName = str(body.lastName);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (col: string, val: unknown) => {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    };

    if (firstName) add("first_name", firstName);
    if (lastName) add("last_name", lastName);
    if (email) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email." }, { status: 400 });
      }
      const dup = await pool.query(
        "SELECT 1 FROM users WHERE LOWER(email) = $1 AND user_id <> $2",
        [email, id]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: "Email already in use." }, { status: 409 });
      }
      add("email", email);
    }
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      add("password_hash", await bcrypt.hash(password, 10));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE user_id = $${values.length}
       RETURNING user_id, first_name, last_name, email, role, date_created AS created_at`,
      values
    );
    return NextResponse.json({ account: rows[0] });
  } catch (err) {
    if (isPgError(err, "23505")) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    console.error("PATCH /api/admin/accounts/[id] failed:", err);
    return NextResponse.json({ error: "Unable to update account." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const check = await getManageableAdmin(id);
    if (check.error) return check.error;

    await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isPgError(err, "23503")) {
      return NextResponse.json(
        { error: "This admin has related records and can't be deleted." },
        { status: 409 }
      );
    }
    console.error("DELETE /api/admin/accounts/[id] failed:", err);
    return NextResponse.json({ error: "Unable to delete account." }, { status: 500 });
  }
}