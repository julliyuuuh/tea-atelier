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
      await pool.query(
        `UPDATE orders SET payment_status = 'paid' WHERE order_id = $1 AND payment_status != 'paid'`,
        [order.order_id]
      );
    } else {
      await pool.query(`UPDATE orders SET payment_status = 'failed' WHERE order_id = $1`, [order.order_id]);
    }
  }

  return new Response("ok", { status: 200 });
}