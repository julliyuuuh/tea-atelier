import { deliverOrderNotificationEmails } from "@/lib/notification-emails";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { ORDER_STATUSES } from "@/lib/order-status";
import { MANUAL_PAYMENT_STATUSES, isCod } from "@/lib/payment-status";

const VALID_STATUSES: string[] = ORDER_STATUSES.map((s) => s.value);

const pick = (obj: Record<string, any> | null, keys: string[]) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
      return obj[k];
  }
  return null;
};

// Delivery details are matched by column name on the orders table so this works
// before I've seen your exact address columns. Replace with an explicit list later.
const DELIVERY_KEY =
  /recipient|phone|address|street|barangay|city|province|region|postal|zip|landmark|note/i;
const NOT_DELIVERY = /(_id|status|fee|cost|amount|total)$/i;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const orderRes = await pool.query(
    `SELECT to_jsonb(o) AS o, to_jsonb(u) AS u
     FROM orders o
     JOIN users u ON u.user_id = o.user_id
     WHERE o.order_id = $1`,
    [id],
  );
  if (orderRes.rows.length === 0) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const o: Record<string, any> = orderRes.rows[0].o;
  const u: Record<string, any> = orderRes.rows[0].u;

  const itemsRes = await pool.query(
    `SELECT to_jsonb(oi) AS oi, to_jsonb(p) AS p
     FROM order_items oi
     LEFT JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.order_items_id`,
    [id],
  );

  const items = itemsRes.rows.map(({ oi, p }) => ({
    id: oi.order_items_id,
    name: p?.product_name ?? "Deleted product",
    image: pick(p, ["image", "image_url", "product_image", "image_path"]),
    quantity: Number(oi.quantity),
    price: Number(oi.price),
  }));
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const total = Number(o.total_amount);

  const delivery = Object.entries(o)
    .filter(
      ([k, v]) =>
        DELIVERY_KEY.test(k) && !NOT_DELIVERY.test(k) && v !== null && v !== "",
    )
    .map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
      value: String(v),
    }));

  const customerName =
    [pick(u, ["first_name"]), pick(u, ["last_name"])]
      .filter(Boolean)
      .join(" ") || pick(u, ["name", "full_name"]);

  return NextResponse.json({
    order: {
      id: o.order_id,
      status: o.order_status,
      createdAt: o.created_at,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      fulfillmentIssue: o.payment_fulfillment_issue ?? null,
      paymongoPaymentId: o.paymongo_payment_id ?? null,
      paymongoSourceId: isCod(o.payment_method)
        ? null
        : (o.paymongo_source_id ?? null),
    },
    customer: {
      name: customerName,
      email: u.email,
      phone: pick(u, ["phone", "phone_number", "contact_number"]),
      joinedAt: u.date_created ?? null,
    },
    delivery,
    items,
    subtotal,
    deliveryFee: Math.max(0, total - subtotal),
    total,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const { status, paymentStatus } = await req.json();

  if (status === undefined && paymentStatus === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (
    paymentStatus !== undefined &&
    !MANUAL_PAYMENT_STATUSES.includes(paymentStatus)
  ) {
    return NextResponse.json(
      { error: "Invalid payment status." },
      { status: 400 },
    );
  }

  const current = await pool.query(
    "SELECT order_status, payment_method, payment_status, to_jsonb(orders)->>'payment_fulfillment_issue' AS fulfillment_issue FROM orders WHERE order_id = $1",
    [id],
  );
  if (current.rows.length === 0) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const order = current.rows[0];
  if (
    order.order_status === "CANCELLED" &&
    status !== undefined &&
    status !== "CANCELLED"
  ) {
    return NextResponse.json(
      {
        error:
          "Cancelled orders cannot be reopened. Create a new order instead.",
      },
      { status: 409 },
    );
  }

  if (
    status === "CANCELLED" &&
    !isCod(order.payment_method) &&
    order.payment_status === "processing"
  ) {
    return NextResponse.json(
      {
        error:
          "Verify the pending payment outcome before cancelling this order.",
      },
      { status: 409 },
    );
  }
  if (
    order.fulfillment_issue &&
    status !== undefined &&
    status !== "PLACED" &&
    status !== "CANCELLED"
  ) {
    return NextResponse.json(
      {
        error:
          "This order has a stock shortage. Contact the customer and arrange cancellation/refund before fulfillment.",
      },
      { status: 409 },
    );
  }

  // An unpaid online order (pending, processing or failed) can only stay at
  // PLACED or be cancelled. Otherwise an admin could ship something nobody paid for.
  if (
    status !== undefined &&
    !isCod(order.payment_method) &&
    order.payment_status !== "paid" &&
    status !== "PLACED" &&
    status !== "CANCELLED"
  ) {
    return NextResponse.json(
      { error: "This order hasn't been paid yet, so it can't move forward." },
      { status: 400 },
    );
  }

  if (paymentStatus !== undefined) {
    // Online payments (GCash/Maya) are owned by the PayMongo webhook.
    if (!isCod(order.payment_method)) {
      return NextResponse.json(
        { error: "Online payments are updated automatically by PayMongo." },
        { status: 403 },
      );
    }
    if ((status ?? order.order_status) === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled orders can't have their payment status changed." },
        { status: 400 },
      );
    }
  }

  const sets: string[] = [];
  const vals: any[] = [];
  if (status !== undefined) {
    vals.push(status);
    sets.push(`order_status = $${vals.length}`);
  }
  if (paymentStatus !== undefined) {
    vals.push(paymentStatus);
    sets.push(`payment_status = $${vals.length}`);
  }
  vals.push(id);

  const idPosition = vals.length;
  vals.push(
    order.order_status,
    order.payment_status,
    order.payment_method,
    order.fulfillment_issue ?? null,
  );
  // Check the values used for validation again inside the update. A concurrent
  // cancellation or payment update must not be overwritten by a stale request.
  const updated = await pool.query(
    `UPDATE orders SET ${sets.join(", ")} WHERE order_id = $${idPosition}
      AND order_status IS NOT DISTINCT FROM $${idPosition + 1}
      AND payment_status IS NOT DISTINCT FROM $${idPosition + 2}
      AND payment_method IS NOT DISTINCT FROM $${idPosition + 3}
      AND (to_jsonb(orders)->>'payment_fulfillment_issue') IS NOT DISTINCT FROM $${idPosition + 4}
      RETURNING order_id`,
    vals,
  );
  if (!updated.rows.length) {
    return NextResponse.json(
      {
        error:
          "This order changed while you were editing. Refresh and try again.",
      },
      { status: 409 },
    );
  }

  await deliverOrderNotificationEmails(Number(id));
  return NextResponse.json({ success: true });
}
