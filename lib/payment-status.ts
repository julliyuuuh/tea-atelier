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