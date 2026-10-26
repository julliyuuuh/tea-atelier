import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import {
  fetchPayment,
  finalizePayment,
  matchesPayment,
  type PaymentOrder,
} from "@/lib/paymongo-payment";
export class CardError extends Error {
  constructor(
    message: string,
    public status = 502,
    public definitive = false,
  ) {
    super(message);
  }
}
export type CardSession = {
  id: string;
  attributes: {
    checkout_url?: string;
    reference_number: string;
    livemode: boolean;
    status: string;
    payment_intent: { id: string };
    line_items: { amount: number; quantity: number; currency: string }[];
    payments?: { id: string }[];
  };
};
export type CardOrder = PaymentOrder & {
  payment_method: string;
  card_session_attempt: string | null;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_intent_id: string | null;
};
const id = (value: unknown, prefix: string) =>
  typeof value === "string" &&
  new RegExp(`^${prefix}_[a-zA-Z0-9]{1,100}$`).test(value);
function headers() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new CardError(
      "Card checkout currently requires PayMongo test keys.",
      503,
    );
  return {
    Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
    "Content-Type": "application/json",
  };
}
async function provider(path: string, attributes?: object, post = false) {
  let r: Response;
  try {
    r = await fetch("https://api.paymongo.com/v1/" + path, {
      method: attributes || post ? "POST" : "GET",
      headers: headers(),
      ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    if (e instanceof CardError) throw e;
    throw new CardError(
      "The payment outcome is not confirmed. Check status before trying again.",
    );
  }
  const d = await r.json().catch(() => null);
  if (!r.ok)
    throw new CardError(
      "PayMongo could not process card checkout. Check the payment dashboard.",
      502,
      [400, 401, 403, 404, 422].includes(r.status),
    );
  if (!d?.data?.id || !d.data.attributes)
    throw new CardError(
      "PayMongo returned an unverified response. Check payment status.",
    );
  return d.data;
}
export async function fetchCardSession(
  sessionId: string,
): Promise<CardSession> {
  if (!id(sessionId, "cs")) throw new CardError("Invalid checkout session.");
  const s = await provider(
    "checkout_sessions/" + encodeURIComponent(sessionId),
  );
  if (s.id !== sessionId)
    throw new CardError("Checkout session could not be verified.");
  return s;
}
const reference = (order: CardOrder) =>
  `TA-${order.order_id}-${order.card_session_attempt}`;
function verifySession(order: CardOrder, session: CardSession) {
  const a = session.attributes;
  if (
    order.payment_method !== "card" ||
    !order.card_session_attempt ||
    a.reference_number !== reference(order) ||
    a.livemode !== false ||
    !id(a.payment_intent?.id, "pi") ||
    (order.paymongo_checkout_session_id &&
      order.paymongo_checkout_session_id !== session.id) ||
    (order.paymongo_payment_intent_id &&
      order.paymongo_payment_intent_id !== a.payment_intent.id) ||
    !Array.isArray(a.line_items) ||
    !a.line_items.length ||
    a.line_items.some(
      (i) =>
        i.currency !== "PHP" ||
        !Number.isSafeInteger(i.amount) ||
        i.amount < 0 ||
        !Number.isSafeInteger(i.quantity) ||
        i.quantity < 1,
    ) ||
    a.line_items.reduce((s, i) => s + i.amount * i.quantity, 0) !==
      Math.round(Number(order.total_amount) * 100)
  )
    throw new CardError("Checkout session does not match this order.", 409);
}
async function bindSession(order: CardOrder, session: CardSession) {
  verifySession(order, session);
  // Keep the known session before subsequent provider reads: retries must use GET,
  // never another creation POST, if intent verification temporarily fails.
  const associated = await pool.query(
    "UPDATE orders SET paymongo_checkout_session_id=$2 WHERE order_id=$1 AND payment_method='card' AND card_session_attempt=$3 AND (paymongo_checkout_session_id IS NULL OR paymongo_checkout_session_id=$2) RETURNING order_id",
    [order.order_id, session.id, order.card_session_attempt],
  );
  if (!associated.rows.length)
    throw new CardError("This checkout attempt changed.", 409);
  const intent = await provider(
    "payment_intents/" +
      encodeURIComponent(session.attributes.payment_intent.id),
  );
  if (
    intent.id !== session.attributes.payment_intent.id ||
    intent.attributes.amount !== Math.round(Number(order.total_amount) * 100) ||
    intent.attributes.currency !== "PHP" ||
    intent.attributes.livemode !== false
  )
    throw new CardError("Payment intent does not match this order.", 409);
  const saved = await pool.query(
    `UPDATE orders SET paymongo_checkout_session_id=$2,paymongo_payment_intent_id=$3 WHERE order_id=$1 AND payment_method='card' AND card_session_attempt=$4 AND (paymongo_checkout_session_id IS NULL OR paymongo_checkout_session_id=$2) AND (paymongo_payment_intent_id IS NULL OR paymongo_payment_intent_id=$3) RETURNING *`,
    [order.order_id, session.id, intent.id, order.card_session_attempt],
  );
  if (!saved.rows[0])
    throw new CardError("This payment attempt changed. Check its status.", 409);
  return { order: saved.rows[0] as CardOrder, intent };
}
export async function reconcileCardSession(sessionId: string) {
  const session = await fetchCardSession(sessionId);
  const match = /^TA-([1-9]\d*)-([0-9a-f-]{36})$/i.exec(
    session.attributes.reference_number || "",
  );
  if (!match) throw new CardError("Unknown checkout reference.", 409);
  const { rows } = await pool.query("SELECT * FROM orders WHERE order_id=$1", [
    match[1],
  ]);
  if (!rows[0]) throw new CardError("Order not found.", 404);
  const bound = await bindSession(rows[0], session);
  const order = bound.order;
  if (order.payment_status === "refunded")
    return { paymentStatus: "refunded", session, order };
  const candidates = [
    ...(session.attributes.payments || []),
    ...(Array.isArray(bound.intent.attributes.payments)
      ? bound.intent.attributes.payments
      : []),
  ];
  const unique = [
    ...new Set<string>(candidates.map((p) => p.id).filter((p) => id(p, "pay"))),
  ];
  let paid = false;
  for (const paymentId of unique) {
    const payment = await fetchPayment(paymentId);
    if (payment.attributes.status !== "paid") continue;
    if (!matchesPayment(payment, order))
      throw new CardError(
        "Captured card payment does not match the order.",
        409,
      );
    await finalizePayment(order, payment);
    paid = true;
    break;
  }
  if (paid || order.payment_status === "paid")
    return { paymentStatus: "paid", session, order };
  // A succeeded intent without a verified payment is unresolved, not failed or payable again.
  if (["processing", "succeeded"].includes(bound.intent.attributes.status))
    return { paymentStatus: "processing", session, order };
  if (
    order.order_status === "CANCELLED" ||
    order.payment_status === "cancelled"
  )
    return { paymentStatus: "cancelled", session, order };
  return {
    paymentStatus:
      session.attributes.status === "expired" ||
      bound.intent.attributes.last_payment_error
        ? "failed"
        : "pending",
    session,
    order,
  };
}
export async function checkCardOrder(order: CardOrder) {
  if (order.payment_status === "paid" || order.payment_status === "refunded")
    return { paymentStatus: order.payment_status };
  if (!order.paymongo_checkout_session_id) {
    if (order.card_session_attempt)
      throw new CardError(
        "Checkout creation is awaiting verification. Contact support before starting another payment.",
        409,
      );
    return { paymentStatus: order.payment_status };
  }
  return reconcileCardSession(order.paymongo_checkout_session_id);
}
export async function startCardOrder(orderId: number, userId: number) {
  let site: URL;
  try {
    site = new URL(
      process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
    );
  } catch {
    throw new CardError("Checkout return address is not configured.", 503);
  }
  if (
    (site.protocol !== "https:" &&
      !(
        site.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(site.hostname)
      )) ||
    site.username ||
    site.password
  )
    throw new CardError("Checkout return address is not configured.", 503);
  headers();
  const client = await pool.connect();
  let order: CardOrder;
  let attempt: string;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    const result = await client.query(
      "SELECT * FROM orders WHERE order_id=$1 AND user_id=$2 FOR UPDATE",
      [orderId, userId],
    );
    order = result.rows[0];
    if (!order || order.payment_method !== "card")
      throw new CardError("Card order not found.", 404);
    if (
      order.payment_status === "paid" ||
      order.payment_status === "refunded" ||
      order.order_status === "CANCELLED"
    ) {
      await client.query("COMMIT");
      return {
        paymentStatus:
          order.payment_status === "refunded"
            ? "paid"
            : order.order_status === "CANCELLED"
              ? "cancelled"
              : order.payment_status,
      };
    }
    if (order.paymongo_checkout_session_id) {
      await client.query("COMMIT");
      const current = await checkCardOrder(order);
      if (
        ["paid", "processing", "cancelled", "refunded"].includes(
          current.paymentStatus,
        )
      )
        return {
          paymentStatus:
            current.paymentStatus === "refunded"
              ? "paid"
              : current.paymentStatus,
        };
      const session = (
        current as Awaited<ReturnType<typeof reconcileCardSession>>
      ).session;
      if (session.attributes.status === "expired")
        throw new CardError(
          "This checkout expired. Cancel this unpaid order and start a new checkout.",
          409,
        );
      return { checkoutUrl: checkoutUrl(session) };
    }
    if (order.card_session_attempt)
      throw new CardError(
        "Checkout creation is awaiting verification. Check status or contact support; do not start another payment.",
        409,
      );
    headers();
    attempt = randomUUID();
    await client.query(
      "UPDATE orders SET card_session_attempt=$2 WHERE order_id=$1",
      [orderId, attempt],
    );
    await client.query("COMMIT");
    order = { ...order, card_session_attempt: attempt };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  let session: CardSession;
  try {
    session = await provider("checkout_sessions", {
      description: `Tea Atelier order #TA-${orderId}`,
      reference_number: reference(order),
      send_email_receipt: false,
      show_description: true,
      show_line_items: true,
      line_items: [
        {
          name: `Tea Atelier order #TA-${orderId}`,
          amount: Math.round(Number(order.total_amount) * 100),
          currency: "PHP",
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      success_url: new URL(
        `/checkout?orderId=${orderId}&payment=success`,
        site,
      ).toString(),
      cancel_url: new URL(
        `/checkout?orderId=${orderId}&payment=cancelled`,
        site,
      ).toString(),
    });
  } catch (e) {
    if (e instanceof CardError && e.definitive)
      await pool.query(
        "UPDATE orders SET card_session_attempt=NULL WHERE order_id=$1 AND card_session_attempt=$2 AND paymongo_checkout_session_id IS NULL",
        [orderId, attempt],
      );
    throw e;
  }
  if (!id(session.id, "cs"))
    throw new CardError(
      "Checkout response could not be verified. Contact support.",
    );
  await pool.query(
    "UPDATE orders SET paymongo_checkout_session_id=$2 WHERE order_id=$1 AND payment_method='card' AND card_session_attempt=$3 AND paymongo_checkout_session_id IS NULL",
    [orderId, session.id, attempt],
  );
  await bindSession(order, session);
  return { checkoutUrl: checkoutUrl(session) };
}
function checkoutUrl(session: CardSession) {
  let url: URL;
  try {
    url = new URL(session.attributes.checkout_url || "");
  } catch {
    throw new CardError("No valid checkout address was returned.");
  }
  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "checkout.paymongo.com" ||
      url.hostname.endsWith(".checkout.paymongo.com")
    ) ||
    url.username ||
    url.password
  )
    throw new CardError("Checkout address could not be verified.");
  return url.toString();
}
export async function expireCardOrder(order: CardOrder) {
  if (!order.paymongo_checkout_session_id) {
    if (order.card_session_attempt)
      throw new CardError(
        "Checkout creation is unresolved. Contact support before cancelling.",
        409,
      );
    return;
  }
  let result = await checkCardOrder(order);
  if (["paid", "processing", "refunded"].includes(result.paymentStatus))
    throw new CardError(
      "Payment is being confirmed. Verify its status before cancelling.",
      409,
    );
  if (
    (result as Awaited<ReturnType<typeof reconcileCardSession>>).session
      .attributes.status !== "expired"
  )
    await provider(
      `checkout_sessions/${encodeURIComponent(order.paymongo_checkout_session_id)}/expire`,
      undefined,
      true,
    );
  result = await checkCardOrder(order);
  if (
    (result as Awaited<ReturnType<typeof reconcileCardSession>>).session
      .attributes.status !== "expired" ||
    ["paid", "processing", "refunded"].includes(result.paymentStatus)
  )
    throw new CardError(
      "Checkout could not be safely cancelled. Check its status.",
      409,
    );
}
