import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { customerId } = await params;

  const customerResult = await pool.query(
    `SELECT user_id, first_name, last_name, email, phone_number, avatar_url, is_verified, is_suspended, date_created
     FROM users
     WHERE user_id = $1 AND role = 'customer'`,
    [customerId]
  );

  const customer = customerResult.rows[0];
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Orders are paginated: ?page=1&limit=5 (limit capped at 50).
  const url = new URL(req.url);
  const requestedPage = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") || "5", 10) || 5)
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1`,
    [customerId]
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
    [customerId, limit, (ordersPage - 1) * limit]
  );

  return NextResponse.json({
    customer: {
      id: customer.user_id,
      name: `${customer.first_name} ${customer.last_name}`,
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
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { customerId } = await params;
  const { suspend } = await req.json();

  if (typeof suspend !== "boolean") {
    return NextResponse.json({ error: "Missing 'suspend' boolean." }, { status: 400 });
  }

  const result = await pool.query(
    `UPDATE users
     SET is_suspended = $1
     WHERE user_id = $2 AND role = 'customer'
     RETURNING is_suspended`,
    [suspend, customerId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ isSuspended: result.rows[0].is_suspended });
}