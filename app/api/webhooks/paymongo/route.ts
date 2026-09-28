import { verifyPaymongoSignature } from "@/lib/paymongo";
import { pool } from "@/lib/db";

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
      `SELECT order_id FROM orders WHERE paymongo_source_id = $1`, [sourceId]
    );
    const order = orderRes.rows[0];
    if (!order) return new Response("ok", { status: 200 });

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
          await client.query("DELETE FROM cart WHERE user_id = $1", [upd.rows[0].user_id]);
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } else {
      await pool.query(`UPDATE orders SET payment_status = 'failed' WHERE order_id = $1`, [order.order_id]);
    }
  }

  return new Response("ok", { status: 200 });
}