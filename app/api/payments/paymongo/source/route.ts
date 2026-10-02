// app/api/payments/paymongo/source/route.ts

import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

const ALLOWED_TYPES = ["gcash", "grabpay"];

export async function POST(req: Request) {
  // 1. Must be logged in
  const userId = getUserId(req);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Validate input. NOTE: the client's `amount` is deliberately ignored.
  const body = await req.json().catch(() => null);
  const orderId = Number(body?.orderId);
  const type = body?.type;

  if (!Number.isInteger(orderId) || orderId <= 0 || !ALLOWED_TYPES.includes(type)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // 3. The order must exist AND belong to this user. Returning 404 (not 403)
  //    avoids revealing whether someone else's order ID exists.
  const orderRes = await pool.query(
    `SELECT order_id, total_amount, payment_status, payment_method
     FROM orders
     WHERE order_id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  const order = orderRes.rows[0];
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  // 4. Payment method must match what the order was placed with
  if (order.payment_method !== type) {
    return Response.json(
      { error: "Payment method doesn't match this order." },
      { status: 400 }
    );
  }

  // 5. Don't start a new payment for an order that is paid or mid-payment
  if (order.payment_status === "paid" || order.payment_status === "processing") {
    return Response.json(
      { error: "This order has already been paid or is being processed." },
      { status: 409 }
    );
  }

  if (!process.env.APP_URL) {
    console.error("APP_URL is not set");
    return Response.json({ error: "Payment initiation failed." }, { status: 500 });
  }

  // 6. The amount comes from the database, never from the browser
  const amountCentavos = Math.round(parseFloat(order.total_amount) * 100);
  const sourceType = type === "grabpay" ? "grab_pay" : "gcash";

  let res: Response;
  let source: any;
  try {
    res = await fetch("https://api.paymongo.com/v1/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            redirect: {
              success: `${process.env.APP_URL}/order-confirmation?orderId=${order.order_id}`,
              failed: `${process.env.APP_URL}/checkout?payment=failed&orderId=${order.order_id}`,
            },
            type: sourceType,
            currency: "PHP",
          },
        },
      }),
    });
    source = await res.json();
  } catch (error) {
    console.error("PayMongo source request failed:", error);
    return Response.json({ error: "Payment initiation failed." }, { status: 502 });
  }

  if (!res.ok) {
    console.error("PayMongo rejected source creation:", source?.errors);
    return Response.json({ error: "Payment initiation failed." }, { status: 400 });
  }

  // 7. Save the source ID on this user's order only
  await pool.query(
    `UPDATE orders SET paymongo_source_id = $1 WHERE order_id = $2 AND user_id = $3`,
    [source.data.id, order.order_id, userId]
  );

  return Response.json({ checkoutUrl: source.data.attributes.redirect.checkout_url });
}