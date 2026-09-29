import { verifyPaymongoSignature } from "@/lib/paymongo";
import { pool } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("paymongo-signature");
  if (!verifyPaymongoSignature(rawBody, signature, process.env.PAYMONGO_WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.data.attributes.type === "source.chargeable") {
    const sourceId = event.data.attributes.data.id;
    const orderRes = await pool.query(
      `SELECT order_id, user_id, payment_status, total_amount, recipient_name
       FROM orders WHERE paymongo_source_id = $1`,
      [sourceId]
    );
    const order = orderRes.rows[0];
    if (!order) return new Response("ok", { status: 200 });

    // Already processed (e.g. a retried webhook delivery), skip re-charging
    if (order.payment_status === "paid") {
      return new Response("ok", { status: 200 });
    }

    const payRes = await fetch("https://api.paymongo.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        data: { attributes: {
          amount: event.data.attributes.data.attributes.amount,
          source: { id: sourceId, type: "source" },
          currency: "PHP",
        }},
      }),
    });
    const payment = await payRes.json();

    if (payRes.ok && payment.data.attributes.status === "paid") {
      const client = await pool.connect();
      let itemsForEmail: { name: string; quantity: number; price: number }[] = [];
      let userEmail: string | undefined;

      try {
        await client.query("BEGIN");

        const upd = await client.query(
          `UPDATE orders SET payment_status = 'paid'
          WHERE order_id = $1 AND payment_status != 'paid'
          RETURNING user_id`,
          [order.order_id]
        );

        // Only runs the first time (guards against duplicate webhook deliveries)
        if (upd.rows.length > 0) {
          await client.query(
            `UPDATE products p
            SET stock_quantity = GREATEST(p.stock_quantity - oi.quantity, 0)
            FROM order_items oi
            WHERE oi.order_id = $1 AND oi.product_id = p.product_id`,
            [order.order_id]
          );

          // Grab items + email now, before the cart is cleared
          const emailRes = await client.query(
            `SELECT u.email, oi.quantity, oi.price, p.product_name
             FROM order_items oi
             JOIN products p ON p.product_id = oi.product_id
             JOIN users u ON u.user_id = $2
             WHERE oi.order_id = $1`,
            [order.order_id, upd.rows[0].user_id]
          );
          if (emailRes.rows.length > 0) {
            userEmail = emailRes.rows[0].email;
            itemsForEmail = emailRes.rows.map((row) => ({
              name: row.product_name,
              quantity: row.quantity,
              price: parseFloat(row.price),
            }));
          }

          await client.query("DELETE FROM cart WHERE user_id = $1", [upd.rows[0].user_id]);
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }

      // Send the confirmation email after commit, a failure here shouldn't
      // undo the payment confirmation, so just log and move on.
      if (userEmail) {
        try {
          await sendOrderConfirmationEmail(
            userEmail,
            order.recipient_name || "there",
            order.order_id,
            itemsForEmail,
            parseFloat(order.total_amount)
          );
        } catch (emailError) {
          console.error(`Order ${order.order_id} paid, but confirmation email failed:`, emailError);
        }
      }
    } else {
      await pool.query(`UPDATE orders SET payment_status = 'failed' WHERE order_id = $1`, [order.order_id]);
    }
  }

  return new Response("ok", { status: 200 });
}