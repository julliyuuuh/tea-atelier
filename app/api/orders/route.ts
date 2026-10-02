// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getShippingFee } from "@/lib/shipping";

const ALLOWED_PAYMENT_METHODS = ["cod", "gcash", "grabpay"];

// Optional fields may be empty; required fields must be non-empty strings.
function isValidText(value: unknown, maxLength: number, required = false): boolean {
  if (value === undefined || value === null || value === "") return !required;
  return typeof value === "string" && value.length <= maxLength;
}

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  // Guard against ?page=abc, ?page=-3, ?page=0 (would produce an invalid OFFSET)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = 4;
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(
    "SELECT COUNT(*) FROM orders WHERE user_id = $1",
    [userId]
  );
  const totalOrders = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalOrders / pageSize);

  const ordersResult = await pool.query(
    `SELECT order_id, shipping_cost, total_amount, order_status, payment_status, payment_method, recipient_name, created_at
    FROM orders
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );

  const orders = await Promise.all(
    ordersResult.rows.map(async (order) => {
      const itemsResult = await pool.query(
        `SELECT oi.quantity, oi.price, p.product_name, p.product_image
         FROM order_items oi
         JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = $1`,
        [order.order_id]
      );

      return {
        id: order.order_id,
        status: order.order_status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        recipientName: order.recipient_name,
        shippingCost: parseFloat(order.shipping_cost),
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        items: itemsResult.rows.map((item) => ({
          name: item.product_name,
          image: item.product_image,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      };
    })
  );

  return NextResponse.json({ orders, totalPages, currentPage: page });
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // NOTE: deliveryFee is intentionally NOT read from the request body anymore.
  // Old app versions may still send it; it is simply ignored.
  const { street, city, province, barangay, paymentMethod, phone, fullName } = body;

  if (!street || !city || !province) {
    return NextResponse.json({ error: "All address fields are required." }, { status: 400 });
  }

  if (
    !isValidText(street, 200, true) ||
    !isValidText(city, 100, true) ||
    !isValidText(province, 100, true) ||
    !isValidText(barangay, 100) ||
    !isValidText(phone, 20) ||
    !isValidText(fullName, 100)
  ) {
    return NextResponse.json(
      { error: "Please check your address and contact details." },
      { status: 400 }
    );
  }

  // Only accept known payment methods
  const method: string = paymentMethod || "cod";
  if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Block suspended accounts, even if they still hold a token issued
    // before they were suspended. Also grab the email for the confirmation.
    // FOR UPDATE locks this user's row until the transaction ends, so two
    // simultaneous orders from the same user run one after the other
    // (prevents double orders from a double-click).
    const userResult = await client.query(
      `SELECT email, is_suspended FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (userResult.rows[0]?.is_suspended) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      );
    }
    const userEmail = userResult.rows[0]?.email as string | undefined;

    // Get the user's current cart, with live prices/stock based from products table
    const cartResult = await client.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock_quantity, p.product_name
       FROM cart c
       JOIN products p ON p.product_id = c.product_id
       WHERE c.user_id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // Verify stock is still sufficient for every item
    for (const item of cartResult.rows) {
      if (item.quantity > item.stock_quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Only ${item.stock_quantity} left of ${item.product_name}.` },
          { status: 400 }
        );
      }
    }

    // Save the delivery address
    const addressResult = await client.query(
      `INSERT INTO user_address (user_id, address_line1, address_line2, barangay)
      VALUES ($1, $2, $3, $4)
      RETURNING address_id`,
      [
        userId,
        street,
        [barangay, city, province].filter(Boolean).join(", "),
        barangay || null,
      ]
    );
    const addressId = addressResult.rows[0].address_id;

    // Calculate totals from real DB prices and the server-side shipping fee,
    // never from client-supplied numbers
    const subtotal = cartResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const shippingCost = getShippingFee();
    const totalAmount = subtotal + shippingCost;

    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, shipping_cost, total_amount, order_status, payment_method, contact_phone, recipient_name)
      VALUES ($1, $2, $3, $4, 'PLACED', $5, $6, $7)
      RETURNING order_id, payment_status`,
      [userId, addressId, shippingCost, totalAmount, method, phone || null, fullName || null]
    );
    const orderId = orderResult.rows[0].order_id;
    const paymentStatus = orderResult.rows[0].payment_status;

    // Create order_items and decrement stock for each cart item
    const isCod = method === "cod";

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      if (isCod) {
        // Conditional decrement: only succeeds if enough stock remains at this
        // exact moment, so two buyers can't both take the last item.
        const upd = await client.query(
          `UPDATE products SET stock_quantity = stock_quantity - $1
           WHERE product_id = $2 AND stock_quantity >= $1`,
          [item.quantity, item.product_id]
        );
        if (upd.rowCount === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `${item.product_name} just sold out.` },
            { status: 409 }
          );
        }
      }
    }

    // Clear the cart
    if (isCod) {
      await client.query("DELETE FROM cart WHERE user_id = $1", [userId]);
    }

    await client.query("COMMIT");

    // Fire the confirmation email only for COD, where the order is genuinely
    // final at this point. For e-wallets, the order isn't paid yet, the
    // webhook sends the confirmation once payment_status flips to 'paid'.
    if (userEmail && isCod) {
      try {
        await sendOrderConfirmationEmail(
          userEmail,
          fullName || "there",
          orderId,
          cartResult.rows.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
          totalAmount
        );
      } catch (emailError) {
        console.error(`Order ${orderId} placed, but confirmation email failed:`, emailError);
      }
    }

    return NextResponse.json({
      orderId,
      paymentStatus,
      subtotal: subtotal.toFixed(2),
      deliveryFee: shippingCost.toFixed(2),
      total: totalAmount.toFixed(2),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Order placement failed:", error);
    return NextResponse.json({ error: "Unable to place order." }, { status: 500 });
  } finally {
    client.release();
  }
}