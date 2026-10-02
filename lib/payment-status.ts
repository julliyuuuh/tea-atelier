export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
] as const;

// Statuses an admin can set by hand (COD only)
export const MANUAL_PAYMENT_STATUSES: string[] = ["pending", "paid"];

export const isCod = (method: string | null | undefined) => {
  const m = (method ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  return m === "cod" || m === "cashondelivery";
};

// "processing" is a short-lived internal status the PayMongo webhook sets while
// its charging an order. It's never listed in PAYMENT_STATUSES (admins can't
// pick it); for display and filtering it counts as "pending".
export const isPendingLike = (status: string | null | undefined) =>
  status === "pending" || status === "processing";

// Online (e-wallet) order that hasn't been paid: pending, processing or failed
export const isUnpaidOnline = (
  method: string | null | undefined,
  paymentStatus: string | null | undefined,
) => !isCod(method) && paymentStatus !== "paid";

// Online order still waiting on payment (not failed, not paid)
export const isAwaitingOnline = (
  method: string | null | undefined,
  paymentStatus: string | null | undefined,
) => !isCod(method) && isPendingLike(paymentStatus);