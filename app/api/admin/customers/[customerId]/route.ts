import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const { customerId } = await params;

  const customerResult = await pool.query(
    `SELECT user_id, first_name, last_name, email, phone_number, is_verified, is_suspended, date_created
     FROM users
     WHERE user_id = $1 AND role = 'customer'`,
    [customerId]
  );

  const customer = customerResult.rows[0];
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const ordersResult = await pool.query(
    `SELECT order_id, order_status, total_amount, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [customerId]
  );

  return NextResponse.json({
    customer: {
      id: customer.user_id,
      name: `${customer.first_name} ${customer.last_name}`,
      email: customer.email,
      phone: customer.phone_number,
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
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { error } = requireAdmin(req);
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