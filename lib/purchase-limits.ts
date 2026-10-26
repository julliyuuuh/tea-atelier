export type TierLimits = {
  perProduct: number;
  totalUnits: number;
  totalCents: number;
};
export type PurchaseLimits = {
  standard: TierLimits;
  business: TierLimits;
  codCents: number;
};
export const DEFAULT_PURCHASE_LIMITS: PurchaseLimits = {
  standard: { perProduct: 10, totalUnits: 30, totalCents: 3000000 },
  business: { perProduct: 100, totalUnits: 200, totalCents: 25000000 },
  codCents: 1000000,
};
export function validatePurchaseLimits(value: unknown): PurchaseLimits {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid purchase limits.");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) => !["standard", "business", "codCents"].includes(k),
    )
  )
    throw Error("Invalid purchase limits.");
  for (const tier of ["standard", "business"] as const) {
    const t = v[tier] as TierLimits;
    if (
      !t ||
      typeof t !== "object" ||
      Array.isArray(t) ||
      Object.keys(t).some(
        (k) => !["perProduct", "totalUnits", "totalCents"].includes(k),
      ) ||
      !Number.isSafeInteger(t.perProduct) ||
      t.perProduct < 1 ||
      t.perProduct > 1000 ||
      !Number.isSafeInteger(t.totalUnits) ||
      t.totalUnits < t.perProduct ||
      t.totalUnits > 10000 ||
      !Number.isSafeInteger(t.totalCents) ||
      t.totalCents < 100 ||
      t.totalCents > 100000000
    )
      throw Error(
        "Check purchase limits: positive whole units and order totals up to ₱1,000,000.",
      );
  }
  const b = v.business as TierLimits,
    s = v.standard as TierLimits;
  if (
    b.perProduct < s.perProduct ||
    b.totalUnits < s.totalUnits ||
    b.totalCents < s.totalCents ||
    !Number.isSafeInteger(v.codCents) ||
    Number(v.codCents) < 100 ||
    Number(v.codCents) > s.totalCents
  )
    throw Error(
      "Business limits must cover standard limits, and the COD cap cannot exceed the standard order cap.",
    );
  return {
    standard: { ...s },
    business: { ...b },
    codCents: Number(v.codCents),
  };
}
export const php = (cents: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function purchaseViolation(
  items: { quantity: number }[],
  totalCents: number,
  method: string,
  limits: PurchaseLimits,
  approved: boolean,
): string | null {
  const tier = approved ? limits.business : limits.standard;
  if (items.some((i) => !Number.isSafeInteger(i.quantity) || i.quantity < 1))
    return "Choose valid whole-number quantities.";
  if (items.some((i) => i.quantity > tier.perProduct))
    return `Your account allows up to ${tier.perProduct} units per product.`;
  if (items.reduce((n, i) => n + i.quantity, 0) > tier.totalUnits)
    return `Your account allows up to ${tier.totalUnits} units per checkout.`;
  if (!Number.isSafeInteger(totalCents) || totalCents < 0)
    return "Unable to calculate the order total.";
  if (totalCents > tier.totalCents)
    return `Your order limit is ${php(tier.totalCents)}, including delivery. Contact us for larger purchases.`;
  if (method === "cod" && totalCents > limits.codCents)
    return `Cash on delivery is available up to ${php(limits.codCents)}, including delivery. Choose an online payment method.`;
  return null;
}
