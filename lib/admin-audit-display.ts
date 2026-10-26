// Presentation helpers only. Audit snapshots remain unchanged in storage.
export function auditFieldLabel(value: string): string {
  const names: Record<string, string> = {
    purchaseLimits: "Purchase limits",
    perProduct: "Units per product",
    totalUnits: "Units per checkout",
    totalCents: "Order total",
    codCents: "COD maximum",
    feeCents: "Fee",
    usd: "USD",
    phpPerUsd: "PHP per USD",
    enabled: "Enabled",
    cod: "Cash on delivery",
    gcash: "GCash",
    paymongo: "PayMongo",
    shipping: "Shipping",
    email: "Email",
    phone_number: "Phone number",
  };
  return (
    names[value] ||
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function auditDisplayValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.length ? value.map(auditDisplayValue).join("\n") : "None";
  if (record(value))
    return (
      Object.entries(value)
        .map(([key, v]) => `${auditFieldLabel(key)}: ${auditDisplayValue(v)}`)
        .join("\n") || "None"
    );
  return String(value);
}
function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (record(a) && record(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]))
    );
  }
  return false;
}
export type AuditChange = {
  path: string;
  label: string;
  before: unknown;
  after: unknown;
};
export function auditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChange[] {
  const rows: AuditChange[] = [];
  function walk(a: unknown, b: unknown, path: string[]) {
    if (equal(a, b)) return;
    if (
      (record(a) || a == null) &&
      (record(b) || b == null) &&
      (record(a) || record(b))
    ) {
      const left = record(a) ? a : {},
        right = record(b) ? b : {};
      const keys = Array.from(
        new Set([...Object.keys(left), ...Object.keys(right)]),
      );
      if (keys.length) {
        for (const key of keys) walk(left[key], right[key], [...path, key]);
        return;
      }
    }
    const moneyKeys = [
      "feeCents",
      "totalCents",
      "codCents",
      "freeShippingThresholdCents",
      "refund_amount_cents",
      "amount_cents",
    ];
    const show = (value: unknown) =>
      moneyKeys.includes(path[path.length - 1]) && typeof value === "number"
        ? new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
          }).format(value / 100)
        : value;
    rows.push({
      path: JSON.stringify(path),
      label: path.map(auditFieldLabel).join(" · "),
      before: show(a),
      after: show(b),
    });
  }
  const a = before || {},
    b = after || {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
    walk(a[key], b[key], [key]);
  return rows;
}
