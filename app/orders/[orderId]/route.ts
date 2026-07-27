import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;

  const orderResult = await pool.query(
    `SELECT order_id, user_id, shipping_cost, total_amount, order_status,
            created_at, payment_method, contact_phone, recipient_name
     FROM orders
     WHERE order_id = $1`,
    [orderId]
  );

  const order = orderResult.rows[0];

  // Order doesn't exist, OR exists but belongs to a different user —
  // same 404 for both so we don't leak which orders exist.
  if (!order || order.user_id !== userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const itemsResult = await pool.query(
    `SELECT oi.product_id, oi.quantity, oi.price, p.product_name, p.product_image
     FROM order_items oi
     JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  const subtotal = itemsResult.rows.reduce(
    (sum, row) => sum + parseFloat(row.price) * row.quantity,
    0
  );

  return NextResponse.json({
    orderId: order.order_id,
    recipientName: order.recipient_name,
    orderStatus: order.order_status,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    subtotal,
    deliveryFee: parseFloat(order.shipping_cost),
    total: parseFloat(order.total_amount),
    items: itemsResult.rows.map((row) => ({
      productId: row.product_id,
      name: row.product_name,
      image: row.product_image,
      quantity: row.quantity,
      price: parseFloat(row.price),
    })),
  });
}