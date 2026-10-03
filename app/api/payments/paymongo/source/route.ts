import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";

const ALLOWED_TYPES = ["gcash", "grabpay"];
const TERMINAL_SOURCE_STATUSES = ["expired", "failed", "cancelled"];

type PaymongoSource = {
  id: string;
  attributes: {
    status: string;
    amount: number;
    currency: string;
    type: string;
    redirect?: { checkout_url?: string };
  };
};

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId = Number(body?.orderId);
  const type = body?.type;

  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    typeof type !== "string" ||
    !ALLOWED_TYPES.includes(type)
  ) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

  if (!secretKey || !appUrl) {
    console.error("PayMongo configuration is missing");
    return Response.json(
      { error: "Payment initiation is unavailable." },
      { status: 503 }
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization:
      "Basic " + Buffer.from(secretKey + ":").toString("base64"),
  };

  const requestSource = async (
    url: string,
    options: RequestInit = {}
  ): Promise<PaymongoSource> => {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json().catch(() => null);

    if (
      !res.ok ||
      typeof result?.data?.id !== "string" ||
      !result.data.attributes
    ) {
      throw new Error("Unable to obtain a valid PayMongo source");
    }

    return result.data;
  };

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");

      // Serialize source creation for this order across requests.
      const orderRes = await client.query(
        `SELECT order_id, total_amount, payment_status,
                payment_method, paymongo_source_id
         FROM orders
         WHERE order_id = $1 AND user_id = $2
         FOR UPDATE`,
        [orderId, userId]
      );
      const order = orderRes.rows[0];

      const finish = async (payload: object, status = 200) => {
        await client.query("COMMIT");
        return Response.json(payload, { status });
      };

      if (!order) {
        return finish({ error: "Order not found." }, 404);
      }

      if (order.payment_method !== type) {
        return finish(
          { error: "Payment method doesn't match this order." },
          400
        );
      }

      if (
        order.payment_status === "paid" ||
        order.payment_status === "processing" ||
        order.payment_status === "cancelled"
      ) {
        return finish(
          {
            paymentStatus: order.payment_status,
            error: "This order is paid, being processed, or cancelled.",
          },
          409
        );
      }

      if (!["pending", "failed"].includes(order.payment_status)) {
        return finish(
          { error: "This order is not available for payment." },
          409
        );
      }

      const amount = Math.round(Number(order.total_amount) * 100);
      const sourceType = type === "grabpay" ? "grab_pay" : "gcash";

      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error("Invalid order amount");
      }

      const matchesOrder = (source: PaymongoSource) =>
        source.attributes.amount === amount &&
        source.attributes.currency === "PHP" &&
        source.attributes.type === sourceType;

      if (order.paymongo_source_id) {
        const existing = await requestSource(
          `https://api.paymongo.com/v1/sources/${encodeURIComponent(
            order.paymongo_source_id
          )}`
        );

        if (
          existing.id !== order.paymongo_source_id ||
          !matchesOrder(existing)
        ) {
          throw new Error("Saved payment source does not match the order");
        }

        const status = existing.attributes.status;

        if (status === "pending") {
          const checkoutUrl = existing.attributes.redirect?.checkout_url;
          if (!checkoutUrl) {
            throw new Error("Existing payment link is unavailable");
          }

          // Repair a previous locally marked failure when PayMongo
          // confirms this same source is still pending.
          await client.query(
            `UPDATE orders SET payment_status = 'pending'
             WHERE order_id = $1 AND user_id = $2`,
            [orderId, userId]
          );

          return finish({
            checkoutUrl,
            paymentStatus: "pending",
            reused: true,
          });
        }

        if (status === "chargeable" || status === "paid") {
          // Do not claim database processing here: the webhook owns
          // that claim and finalizes the payment.
          return finish(
            {
              paymentStatus: "processing",
              error: "Payment confirmation is in progress. Check status.",
            },
            409
          );
        }

        if (!TERMINAL_SOURCE_STATUSES.includes(status)) {
          throw new Error("Existing payment outcome is unresolved");
        }
      }

      // Create only when there is no source, or the previous source
      // has a confirmed terminal failure/expiry.
      const source = await requestSource(
        "https://api.paymongo.com/v1/sources",
        {
          method: "POST",
          body: JSON.stringify({
            data: {
              attributes: {
                amount,
                currency: "PHP",
                type: sourceType,
                redirect: {
                  success: `${appUrl}/order-confirmation?orderId=${orderId}`,
                  failed: `${appUrl}/checkout?payment=failed&orderId=${orderId}`,
                },
              },
            },
          }),
        }
      );

      const checkoutUrl = source.attributes.redirect?.checkout_url;

      if (
        !matchesOrder(source) ||
        source.attributes.status !== "pending" ||
        !checkoutUrl
      ) {
        throw new Error("New payment source is not usable");
      }

      await client.query(
        `UPDATE orders
         SET paymongo_source_id = $1, payment_status = 'pending'
         WHERE order_id = $2 AND user_id = $3`,
        [source.id, orderId, userId]
      );

      // Save before exposing the payment link to the customer.
      return finish({
        checkoutUrl,
        paymentStatus: "pending",
        reused: false,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PayMongo source request failed:", error);
    return Response.json(
      { error: "Unable to start or resume payment. Please check again." },
      { status: 502 }
    );
  }
}