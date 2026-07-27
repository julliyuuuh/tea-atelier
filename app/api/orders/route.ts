import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { street, barangay, city, province, zip, deliveryFee, paymentMethod } = await req.json();

  if (!street || !barangay || !city || !province || !zip) {
    return NextResponse.json({ error: "All address fields are required." }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
      `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3)
       VALUES ($1, $2, $3, $4)
       RETURNING address_id`,
      [userId, street, barangay, `${city}, ${province} ${zip}`]
    );
    const addressId = addressResult.rows[0].address_id;

    // Calculate totals from real DB prices, not client-supplied ones
    const subtotal = cartResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const shippingCost = parseFloat(deliveryFee) || 0;
    const totalAmount = subtotal + shippingCost;

    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, shipping_cost, total_amount, order_status, payment_method)
       VALUES ($1, $2, $3, $4, 'PENDING', $5)
       RETURNING order_id`,
      [userId, addressId, shippingCost, totalAmount, paymentMethod || "cod"]
    );
    const orderId = orderResult.rows[0].order_id;

    // Create order_items and decrement stock for each cart item
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Clear the cart
    await client.query("DELETE FROM cart WHERE user_id = $1", [userId]);

    await client.query("COMMIT");

    return NextResponse.json({
      orderId,
      subtotal: subtotal.toFixed(2),
      deliveryFee: shippingCost.toFixed(2),
      total: totalAmount.toFixed(2),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Unable to place order." }, { status: 500 });
  } finally {
    client.release();
  }
}