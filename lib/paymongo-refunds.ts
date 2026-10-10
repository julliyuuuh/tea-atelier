import { ReturnError } from "@/lib/returns";

type Resource = {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    livemode: boolean;
    status: string;
    payment_id?: string;
    source?: { id: string };
    refunds?: Resource[];
    metadata?: Record<string, string>;
    notes?: string;
  };
};
export class RefundProviderError extends ReturnError {
  constructor(
    message: string,
    public definitive = false,
  ) {
    super(message, 502);
  }
}
function credentials() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  // This implementation is deliberately limited to the user's test deployment.
  if (!key?.startsWith("sk_test_"))
    throw new ReturnError(
      "Online refunds currently require PayMongo test keys.",
      503,
    );
  return {
    Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
    "Content-Type": "application/json",
  };
}
async function request(path: string, attributes?: object): Promise<Resource> {
  const headers = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.paymongo.com/v1/${path}`, {
      method: attributes ? "POST" : "GET",
      headers,
      ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new RefundProviderError(
      "PayMongo outcome is unknown. Check status before retrying.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Validation/auth rejection did not create a refund. 5xx/timeout/rate-limit
    // outcomes are treated as uncertain, never blindly retried.
    throw new RefundProviderError(
      "PayMongo could not process this request. Check the payment dashboard.",
      [400, 401, 403, 404, 422].includes(response.status),
    );
  }
  if (!body?.data?.id || !body.data.attributes)
    throw new RefundProviderError(
      "PayMongo returned an unverified response. Check status.",
    );
  return body.data;
}
export function validatePayment(
  payment: Resource,
  order: { total_amount: string; paymongo_source_id: string | null },
) {
  const attributes = payment.attributes;
  if (
    !/^pay_[a-zA-Z0-9]+$/.test(payment.id) ||
    attributes.livemode !== false ||
    attributes.currency !== "PHP" ||
    attributes.status !== "paid" ||
    attributes.amount !== Math.round(Number(order.total_amount) * 100) ||
    !order.paymongo_source_id ||
    attributes.source?.id !== order.paymongo_source_id
  ) {
    throw new ReturnError(
      "This test payment does not match the order's amount, source, currency and mode.",
      409,
    );
  }
  if (!Array.isArray(attributes.refunds))
    throw new ReturnError(
      "PayMongo refund history is unavailable. Verify it in the dashboard.",
      409,
    );
  return payment;
}
export async function getPayment(id: string) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(id))
    throw new ReturnError("Enter a valid PayMongo payment ID.");
  return request(`payments/${encodeURIComponent(id)}`);
}
export function refundOutcome(
  refund: Resource,
  paymentId: string,
  amount: number,
) {
  const a = refund.attributes;
  if (
    !/^ref_[a-zA-Z0-9]+$/.test(refund.id) ||
    a.payment_id !== paymentId ||
    a.amount !== amount ||
    a.currency !== "PHP" ||
    a.livemode !== false
  )
    throw new RefundProviderError(
      "Refund details could not be verified. Check status.",
    );
  if (a.status === "succeeded")
    return { id: refund.id, state: "SUCCEEDED" as const };
  if (a.status === "failed") return { id: refund.id, state: "FAILED" as const };
  if (a.status === "pending")
    return { id: refund.id, state: "PENDING" as const };
  throw new RefundProviderError("Refund outcome is unknown. Check status.");
}
export async function createRefund(
  payment: Resource,
  amount: number,
  attemptId: string,
) {
  const reserved = payment.attributes.refunds!.reduce((sum, refund) => {
    if (refund.attributes.status === "failed") return sum;
    if (
      !Number.isSafeInteger(refund.attributes.amount) ||
      refund.attributes.amount < 0
    )
      throw new ReturnError(
        "Payment refund history could not be verified.",
        409,
      );
    return sum + refund.attributes.amount;
  }, 0);
  if (amount <= 0 || amount > payment.attributes.amount - reserved)
    throw new ReturnError(
      "Refund exceeds the payment's remaining refundable amount.",
      409,
    );
  const refund = await request("refunds", {
    amount,
    payment_id: payment.id,
    reason: "requested_by_customer",
    notes: `Tea Atelier refund ${attemptId}`,
    metadata: { tea_atelier_attempt_id: attemptId },
  });
  return refundOutcome(refund, payment.id, amount);
}
export async function checkRefund(
  payment: Resource,
  amount: number,
  attemptId: string,
  refundId?: string | null,
) {
  if (refundId) {
    const refund = await request(`refunds/${encodeURIComponent(refundId)}`);
    return refundOutcome(refund, payment.id, amount);
  }
  const matches = payment.attributes.refunds!.filter(
    (r) =>
      r.attributes.metadata?.tea_atelier_attempt_id === attemptId ||
      r.attributes.notes === `Tea Atelier refund ${attemptId}`,
  );
  if (matches.length !== 1) return null; // Missing does not prove a timed-out POST failed.
  return refundOutcome(matches[0], payment.id, amount);
}
