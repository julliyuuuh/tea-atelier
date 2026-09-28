import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-admin";

async function getManageableAdmin(id: string) {
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

  const { id } = await params;
  const check = await getManageableAdmin(id);
  if (check.error) return check.error;

  const { firstName, lastName, email, password } = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  const add = (col: string, val: unknown) => {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  };

  if (firstName?.trim()) add("first_name", firstName.trim());
  if (lastName?.trim()) add("last_name", lastName.trim());
  if (email?.trim()) {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const dup = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND user_id <> $2",
      [normalizedEmail, id]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    add("email", normalizedEmail);
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
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const check = await getManageableAdmin(id);
  if (check.error) return check.error;

  await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
  return NextResponse.json({ success: true });
}