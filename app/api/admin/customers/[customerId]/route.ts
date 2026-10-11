import { adminQuery } from "@/lib/admin-audit";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { customerId } = await params;
  if (!/^[1-9]\d*$/.test(customerId) || Number(customerId) > 2147483647) {
    return NextResponse.json(
      { error: "Invalid customer ID." },
      { status: 400 },
    );
  }

  const customerResult = await pool.query(
    `SELECT user_id, first_name, last_name, email, phone_number, avatar_url, is_verified, is_suspended, date_created
     FROM users
     WHERE user_id = $1 AND role = 'customer'`,
    [customerId],
  );

  const customer = customerResult.rows[0];
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Orders are paginated: ?page=1&limit=5 (limit capped at 50).
  const url = new URL(req.url);
  const requestedPage = Math.max(
    1,
    parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") || "5", 10) || 5),
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1`,
    [customerId],
  );
  const ordersTotal = countResult.rows[0].count;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / limit));
  const ordersPage = Math.min(requestedPage, ordersTotalPages);

  const ordersResult = await pool.query(
    `SELECT order_id, order_status, total_amount, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC, order_id DESC
     LIMIT $2 OFFSET $3`,
    [customerId, limit, (ordersPage - 1) * limit],
  );

  return NextResponse.json({
    customer: {
      id: customer.user_id,
      name: `${customer.first_name} ${customer.last_name}`,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone_number,
      avatarUrl: customer.avatar_url,
      isVerified: customer.is_verified,
      isSuspended: customer.is_suspended,
      joinedAt: customer.date_created,
    },
    orders: ordersResult.rows.map((order) => ({
      id: order.order_id,
      status: order.order_status,
      totalAmount: parseFloat(order.total_amount),
      createdAt: order.created_at,
    })),
    ordersTotal,
    ordersPage,
    ordersTotalPages,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { error, decoded } = await requireAdmin(req);
  if (error) return error;

  const { customerId } = await params;
  if (!/^[1-9]\d*$/.test(customerId) || Number(customerId) > 2147483647) {
    return NextResponse.json(
      { error: "Invalid customer ID." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid body");
    body = parsed;
  } catch {
    return NextResponse.json(
      { error: "Enter valid customer details." },
      { status: 400 },
    );
  }
  const allowed = ["suspend", "firstName", "lastName", "phoneNumber"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    return NextResponse.json(
      { error: "Only names, phone number and suspension can be updated here." },
      { status: 400 },
    );
  }
  const profileKeys = ["firstName", "lastName", "phoneNumber"];
  const editing = profileKeys.some((key) => key in body);
  if ("suspend" in body && (typeof body.suspend !== "boolean" || editing)) {
    return NextResponse.json(
      { error: "Send suspension and profile changes separately." },
      { status: 400 },
    );
  }
  if (!("suspend" in body) && !editing) {
    return NextResponse.json(
      { error: "No customer changes were provided." },
      { status: 400 },
    );
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  function add(column: string, value: unknown) {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  }
  for (const [key, column] of [
    ["firstName", "first_name"],
    ["lastName", "last_name"],
  ]) {
    if (!(key in body)) continue;
    const value = body[key];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > 50
    ) {
      return NextResponse.json(
        { error: "Names must contain 1 to 50 characters." },
        { status: 400 },
      );
    }
    add(column, value.trim());
  }
  if ("phoneNumber" in body) {
    const phone = body.phoneNumber;
    if (
      phone !== null &&
      (typeof phone !== "string" ||
        (phone.trim() !== "" && !/^09\d{9}$/.test(phone.trim())))
    ) {
      return NextResponse.json(
        { error: "Enter an 11-digit mobile number starting with 09." },
        { status: 400 },
      );
    }
    add(
      "phone_number",
      typeof phone === "string" ? phone.trim() || null : null,
    );
  }
  if ("suspend" in body) add("is_suspended", body.suspend);
  values.push(Number(customerId));

  try {
    const result = await adminQuery(
      decoded!.userId,
      `UPDATE users SET ${fields.join(", ")}
       WHERE user_id = $${values.length} AND role = 'customer'
       RETURNING user_id, first_name, last_name, email, phone_number, avatar_url, is_verified, is_suspended, date_created`,
      values,
    );
    const customer = result.rows[0];
    if (!customer)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    return NextResponse.json({
      isSuspended: customer.is_suspended,
      customer: {
        id: customer.user_id,
        name: `${customer.first_name} ${customer.last_name}`,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone_number,
        avatarUrl: customer.avatar_url,
        isVerified: customer.is_verified,
        isSuspended: customer.is_suspended,
        joinedAt: customer.date_created,
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
    console.error("Customer update failed:", error);
    return NextResponse.json(
      { error: "Unable to update customer." },
      { status: 500 },
    );
  }
}
