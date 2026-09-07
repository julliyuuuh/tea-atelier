import { pool } from "@/lib/db"; 

export async function POST(req: Request) {
  const { orderId, amount, type } = await req.json();
  // verify JWT, verify order belongs to this user, verify `amount` against total_amount in DB, never trust client amount lol

  const res = await fetch("https://api.paymongo.com/v1/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(amount * 100), // centavos
          redirect: {
            success: `${process.env.APP_URL}/order-confirmation?orderId=${orderId}`,
            failed: `${process.env.APP_URL}/checkout?payment=failed&orderId=${orderId}`,
          },
          type, // "gcash" | "paymaya"
          currency: "PHP",
        },
      },
    }),
  });
  const source = await res.json();
  if (!res.ok) return Response.json({ error: source.errors?.[0]?.detail }, { status: 400 });

  await pool.query(
    `UPDATE orders SET paymongo_source_id = $1 WHERE order_id = $2`,
    [source.data.id, orderId]
  );

  return Response.json({ checkoutUrl: source.data.attributes.redirect.checkout_url });
}