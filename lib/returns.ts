export const RETURN_REASONS = {
  damaged: "Damaged item",
  wrong_item: "Wrong item",
  quality: "Product quality",
  cancelled_paid: "Paid order cancelled",
  other: "Other",
} as const;
export type ReturnKind = "RETURN" | "REFUND";
export type ReturnStatus =
  "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CLOSED";
export type RefundState =
  "PROCESSING" | "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
export type ReturnCase = {
  return_id: string;
  order_id: number;
  user_id: number;
  kind: ReturnKind;
  reason: keyof typeof RETURN_REASONS;
  details: string;
  status: ReturnStatus;
  refund_amount_cents: number;
  customer_message: string;
  version: number;
  created_at: string;
  updated_at: string;
  recipient_name?: string;
  total_amount?: string;
  payment_method?: string;
  payment_status?: string;
  order_status?: string;
  paymongo_payment_id?: string | null;
  customer_email?: string;
  refund_state: RefundState | null;
  refund_channel?: string | null;
  refund_is_test?: boolean | null;
  refund_reference?: string | null;
  refund_error?: string | null;
};
export class ReturnError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function parseOrderId(value: unknown) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647)
    throw new ReturnError("Invalid order ID.");
  return Number(value);
}
export function parseReturnId(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ReturnError("Request not found.", 404);
  return value;
}
export function textField(value: unknown, label: string, min = 0, max = 2000) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ReturnError(`${label} must be ${min}–${max} characters.`);
  return value.trim();
}
// Parse decimal text to centavos without floating-point rounding or exponents.
export function toCents(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new ReturnError(
      "Enter a valid amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 2147483647)
    throw new ReturnError("Amount is too large.");
  return result;
}
export function allowedRequest(
  order: { order_status: string; payment_status: string },
  kind: ReturnKind,
) {
  if (kind === "RETURN") return order.order_status === "DELIVERED";
  return (
    order.payment_status === "paid" &&
    ["DELIVERED", "CANCELLED"].includes(order.order_status)
  );
}
export const peso = (cents: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    cents / 100,
  );
