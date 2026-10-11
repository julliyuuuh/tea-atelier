// app/api/orders/route.ts
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { parseAddressLabel } from "@/lib/profile-address";
import {
  getSavedDeliveryAddress,
  parseSavedAddressId,
} from "@/lib/checkout-address";
import { readSettings } from "@/lib/store-settings-server";
import {
  shippingFeeCents,
  SettingsError,
  SHIPPING_OPTIONS,
  type ShippingOption,
  type PaymentOption,
} from "@/lib/store-settings";
const ALLOWED_PAYMENT_METHODS = ["cod", "gcash", "grabpay"];
// Optional fields may be empty; required fields must be non-empty strings.
function isValidText(
  value: unknown,
  maxLength: number,
  required = false,
): boolean {
  if (value === undefined || value === null || value === "") return !required;
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (!required || value.trim().length > 0)
  );
}

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const requestedPage = Math.max(
    1,
    parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const tab = url.searchParams.get("tab") || "all";
  const isCancelled =
    "(payment_status = 'cancelled' OR order_status = 'CANCELLED')";
  const notCancelled =
    "(payment_status IS DISTINCT FROM 'cancelled' AND order_status IS DISTINCT FROM 'CANCELLED')";
  const filters: Record<string, string> = {
    all: "TRUE",
    orders: `${notCancelled} AND (payment_method = 'cod' OR payment_status = 'paid')`,
    cancelled: isCancelled,
    unpaid: `${notCancelled} AND payment_method IS DISTINCT FROM 'cod' AND payment_status IS DISTINCT FROM 'paid'`,
  };
  if (!Object.prototype.hasOwnProperty.call(filters, tab)) {
    return NextResponse.json({ error: "Invalid orders tab." }, { status: 400 });
  }
  const filter = filters[tab];
  const pageSize = 4;
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND (${filter})`,
    [userId],
  );
  const totalOrders = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const ordersResult = await pool.query(
    `SELECT order_id, shipping_cost, total_amount, order_status, payment_status, payment_method, recipient_name, created_at
    FROM orders
    WHERE user_id = $1 AND (${filter})
    ORDER BY created_at DESC, order_id DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  );
  const orders = await Promise.all(
    ordersResult.rows.map(async (order) => {
      const itemsResult = await pool.query(
        `SELECT oi.quantity, oi.price, p.product_name, p.product_image
         FROM order_items oi
         JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = $1`,
        [order.order_id],
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
    }),
  );
  return NextResponse.json({ orders, totalPages, currentPage: page, tab });
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // NOTE: deliveryFee is intentionally NOT read from the request body anymore.
  // Old app versions may still send it; it is simply ignored.
  const {
    street,
    city,
    province,
    barangay,
    saveAddress,
    paymentMethod,
    phone,
    fullName,
  } = body;
  let savedAddressId: number | null;
  let addressLabel: string | null | undefined;
  try {
    savedAddressId = parseSavedAddressId(body.savedAddressId);
    addressLabel = parseAddressLabel(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid address." },
      { status: 400 },
    );
  }
  if (savedAddressId === null && (!street || !city || !province)) {
    return NextResponse.json(
      { error: "All address fields are required." },
      { status: 400 },
    );
  }
  if (
    (savedAddressId === null &&
      (!isValidText(street, 200, true) ||
        !isValidText(city, 100, true) ||
        !isValidText(province, 100, true) ||
        !isValidText(barangay, 100))) ||
    !isValidText(phone, 20) ||
    !isValidText(fullName, 100)
  ) {
    return NextResponse.json(
      { error: "Please check your address and contact details." },
      { status: 400 },
    );
  }
  // Only accept known payment methods
  const method: string = paymentMethod || "cod";
  if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
    return NextResponse.json(
      { error: "Invalid payment method." },
      { status: 400 },
    );
  }
  // One UUID identifies one checkout attempt. Keep it on retries.
  const requestKey = req.headers.get("Idempotency-Key");
  if (
    !requestKey ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestKey,
    )
  ) {
    return NextResponse.json(
      { error: "A valid checkout request key is required." },
      { status: 400 },
    );
  }
  const shippingMethod = body.shippingMethod ?? "standard";
  if (
    typeof shippingMethod !== "string" ||
    !Object.hasOwn(SHIPPING_OPTIONS, shippingMethod)
  ) {
    return NextResponse.json(
      { error: "Invalid delivery option." },
      { status: 400 },
    );
  }
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        ...(savedAddressId !== null
          ? { savedAddressId }
          : {
              street,
              city,
              province,
              barangay: barangay || null,
              saveAddress: saveAddress === true,
              ...(saveAddress === true && addressLabel ? { addressLabel } : {}),
            }),
        paymentMethod: method,
        ...(shippingMethod === "standard" ? {} : { shippingMethod }),
        phone: phone || null,
        fullName: fullName || null,
      }),
    )
    .digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Block suspended accounts, even if they still hold a token issued
    // before they were suspended. Also grab the email for the confirmation.
    // Serialize order creation for this user. The request-key lookup below
    // provides deduplication; the row lock alone only serializes requests.
    const userResult = await client.query(
      `SELECT email, is_suspended FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (userResult.rows[0]?.is_suspended) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 },
      );
    }
    const userEmail = userResult.rows[0]?.email as string | undefined;
    // Look up before reading the cart: COD may already have emptied it.
    const existingOrder = await client.query(
      `SELECT order_id, payment_status, shipping_cost, total_amount, checkout_request_hash
       FROM orders WHERE user_id = $1 AND checkout_request_key = $2`,
      [userId, requestKey.toLowerCase()],
    );
    if (existingOrder.rows.length > 0) {
      const existing = existingOrder.rows[0];
      if (existing.checkout_request_hash !== requestHash) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:
              "This checkout key was already used with different details. Start a new checkout.",
          },
          { status: 409 },
        );
      }
      await client.query("COMMIT");
      const total = Number(existing.total_amount);
      const deliveryFee = Number(existing.shipping_cost);
      return NextResponse.json({
        orderId: existing.order_id,
        paymentStatus: existing.payment_status,
        subtotal: (total - deliveryFee).toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
      });
    }
    // Read current options only for a NEW order. Idempotent retries above retain the saved totals.
    const { config } = await readSettings(client, true);
    if (!config.payments[method as PaymentOption])
      throw new SettingsError(
        "This payment method is unavailable. Choose another option.",
        409,
      );
    shippingFeeCents(config, shippingMethod, 0);
    const savedDelivery =
      savedAddressId !== null
        ? await getSavedDeliveryAddress(client, userId, savedAddressId)
        : null;
    if (savedAddressId !== null && !savedDelivery) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error:
            "That saved address is no longer available. Choose another address or enter a new one.",
        },
        { status: 409 },
      );
    }
    // Get the user's current cart, with live prices/stock based from products table
    const cartResult = await client.query(
      `SELECT c.product_id, c.quantity, c.checkout_revision,
              p.price, p.stock_quantity, p.product_name
      FROM cart c
      JOIN products p ON p.product_id = c.product_id
      WHERE c.user_id = $1 ORDER BY c.product_id`,
      [userId],
    );
    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 },
      );
    }
    // Verify stock is still sufficient for every item
    for (const item of cartResult.rows) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Invalid cart quantity." },
          { status: 400 },
        );
      }
      if (item.quantity > item.stock_quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `Only ${item.stock_quantity} left of ${item.product_name}.`,
          },
          { status: 400 },
        );
      }
    }
    let addressId: string | number;
    if (savedDelivery) {
      // Snapshot the stored address, never delivery text supplied alongside its ID.
      const snapshot = await client.query(
        `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, barangay, is_saved)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING address_id`,
        [
          userId,
          savedDelivery.address_line1,
          savedDelivery.address_line2,
          savedDelivery.address_line3,
          savedDelivery.barangay,
        ],
      );
      addressId = snapshot.rows[0].address_id;
    } else {
      // Save a new delivery address. Every order needs an address row, but only
      // addresses the customer opted to keep (is_saved) show up in their profile.
      // If this user already has an identical address, reuse it instead of
      // creating another copy.
      // Highly urbanized cities like Baguio have no separate province, so drop
      // repeated values ("City of Baguio, City of Baguio").
      const addressLine2 = [
        ...new Set([barangay, city, province].filter(Boolean)),
      ].join(", ");
      const existingAddress = await client.query(
        `SELECT address_id FROM user_address
         WHERE user_id = $1
           AND address_line1 = $2
           AND address_line2 = $3
           AND address_line3 IS NULL
           AND address_label IS NOT DISTINCT FROM $4
           AND business_name IS NULL AND billing_contact IS NULL AND tax_id IS NULL
           AND is_deleted IS NOT TRUE
         LIMIT 1`,
        [
          userId,
          street,
          addressLine2,
          saveAddress === true ? (addressLabel ?? null) : null,
        ],
      );
      if (existingAddress.rows.length > 0) {
        addressId = existingAddress.rows[0].address_id;
        if (saveAddress === true) {
          await client.query(
            `UPDATE user_address SET is_saved = true WHERE address_id = $1`,
            [addressId],
          );
        }
      } else {
        const addressResult = await client.query(
          `INSERT INTO user_address (user_id, address_line1, address_line2, barangay, is_saved, address_label)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING address_id`,
          [
            userId,
            street,
            addressLine2,
            barangay || null,
            saveAddress === true,
            saveAddress === true ? (addressLabel ?? null) : null,
          ],
        );
        addressId = addressResult.rows[0].address_id;
      }
    }
    // Calculate totals from real DB prices and the server-side shipping fee,
    // never from client-supplied numbers
    const subtotalCents = cartResult.rows.reduce(
      (sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity,
      0,
    );
    const subtotal = subtotalCents / 100;
    const shippingCost =
      shippingFeeCents(config, shippingMethod, subtotalCents) / 100;
    const totalAmount = subtotalCents / 100 + shippingCost;
    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, shipping_cost, total_amount, order_status, payment_method, contact_phone, recipient_name, checkout_request_key, checkout_request_hash, shipping_method, shipping_label)
      VALUES ($1, $2, $3, $4, 'PLACED', $5, $6, $7, $8, $9, $10, $11)
      RETURNING order_id, payment_status`,
      [
        userId,
        addressId,
        shippingCost,
        totalAmount,
        method,
        phone || null,
        fullName || null,
        requestKey.toLowerCase(),
        requestHash,
        shippingMethod,
        SHIPPING_OPTIONS[shippingMethod as ShippingOption],
      ],
    );
    const orderId = orderResult.rows[0].order_id;
    const paymentStatus = orderResult.rows[0].payment_status;
    // Create order_items and decrement stock for each cart item
    const isCod = method === "cod";
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, quantity, price, cart_checkout_revision)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.price,
          item.checkout_revision,
        ],
      );
      if (isCod) {
        // Conditional decrement: only succeeds if enough stock remains at this
        // exact moment, so two buyers can't both take the last item.
        const upd = await client.query(
          `UPDATE products SET stock_quantity = stock_quantity - $1
           WHERE product_id = $2 AND stock_quantity >= $1`,
          [item.quantity, item.product_id],
        );
        if (upd.rowCount === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `${item.product_name} just sold out.` },
            { status: 409 },
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
          totalAmount,
        );
      } catch (emailError) {
        console.error(
          `Order ${orderId} placed, but confirmation email failed:`,
          emailError,
        );
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
    if (error instanceof SettingsError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Order placement failed:", error);
    return NextResponse.json(
      { error: "Unable to place order." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
