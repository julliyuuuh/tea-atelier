export const PAYMENT_OPTIONS = {
  cod: "Cash on delivery",
  gcash: "GCash",
  grabpay: "GrabPay",
} as const;
export type PaymentOption = keyof typeof PAYMENT_OPTIONS;
export const SHIPPING_OPTIONS = {
  standard: "Standard delivery",
  express: "Express delivery",
} as const;
export type ShippingOption = keyof typeof SHIPPING_OPTIONS;
export type StoreSettings = {
  store: { name: string; email: string; phone: string; address: string };
  shipping: Record<
    ShippingOption,
    { enabled: boolean; feeCents: number; estimate: string }
  >;
  freeShippingThresholdCents: number | null;
  payments: Record<PaymentOption, boolean>;
  usd: { enabled: boolean; phpPerUsd: number };
};
export type SettingsDocument = {
  config: StoreSettings;
  version: number;
  updatedAt: string;
};
export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: "Tea Atelier",
    email: "hello@teaatelier.com",
    phone: "",
    address: "123 Leaf Street, Quezon City, PH",
  },
  shipping: {
    standard: { enabled: true, feeCents: 500, estimate: "3–5 business days" },
    express: { enabled: false, feeCents: 15000, estimate: "1–2 business days" },
  },
  freeShippingThresholdCents: null,
  payments: { cod: true, gcash: true, grabpay: true },
  usd: { enabled: false, phpPerUsd: 58 },
};
export class SettingsError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function object(
  value: unknown,
  keys: string[],
  label: string,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new SettingsError(`Invalid ${label}.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = false) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new SettingsError(`Check ${label}.`);
  return value.trim();
}
function bool(value: unknown) {
  if (typeof value !== "boolean")
    throw new SettingsError("Options must be enabled or disabled.");
  return value;
}
function cents(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 100000000
  )
    throw new SettingsError("Enter a valid PHP amount (maximum ₱1,000,000).");
  return value;
}
export function validateSettings(value: unknown): StoreSettings {
  const root = object(
    value,
    ["store", "shipping", "freeShippingThresholdCents", "payments", "usd"],
    "settings",
  );
  const store = object(
    root.store,
    ["name", "email", "phone", "address"],
    "store details",
  );
  const email = text(store.email, "contact email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new SettingsError("Enter a valid contact email.");
  const shipping = object(
    root.shipping,
    Object.keys(SHIPPING_OPTIONS),
    "shipping options",
  );
  const resultShipping = {} as StoreSettings["shipping"];
  for (const key of Object.keys(SHIPPING_OPTIONS) as ShippingOption[]) {
    const option = object(
      shipping[key],
      ["enabled", "feeCents", "estimate"],
      "delivery option",
    );
    resultShipping[key] = {
      enabled: bool(option.enabled),
      feeCents: cents(option.feeCents),
      estimate: text(option.estimate, "delivery estimate", 100),
    };
  }
  if (!Object.values(resultShipping).some((option) => option.enabled))
    throw new SettingsError("Keep at least one delivery option enabled.");
  const payments = object(
    root.payments,
    Object.keys(PAYMENT_OPTIONS),
    "payment options",
  );
  const resultPayments = {} as StoreSettings["payments"];
  for (const key of Object.keys(PAYMENT_OPTIONS) as PaymentOption[])
    resultPayments[key] = bool(payments[key]);
  if (!Object.values(resultPayments).some(Boolean))
    throw new SettingsError("Keep at least one payment option enabled.");
  const usd = object(root.usd, ["enabled", "phpPerUsd"], "USD display");
  if (
    typeof usd.phpPerUsd !== "number" ||
    !Number.isFinite(usd.phpPerUsd) ||
    usd.phpPerUsd < 0.01 ||
    usd.phpPerUsd > 1000000 ||
    Math.abs(usd.phpPerUsd * 10000 - Math.round(usd.phpPerUsd * 10000)) >
      0.000001
  )
    throw new SettingsError(
      "Enter a PHP per USD rate with up to four decimals.",
    );
  const threshold =
    root.freeShippingThresholdCents === null
      ? null
      : cents(root.freeShippingThresholdCents);
  if (threshold === 0)
    throw new SettingsError(
      "Free shipping threshold must be positive, or left blank.",
    );
  return {
    store: {
      name: text(store.name, "store name", 100, true),
      email,
      phone: text(store.phone, "phone", 40),
      address: text(store.address, "business address", 500),
    },
    shipping: resultShipping,
    freeShippingThresholdCents: threshold,
    payments: resultPayments,
    usd: { enabled: bool(usd.enabled), phpPerUsd: usd.phpPerUsd },
  };
}
export function shippingFeeCents(
  config: StoreSettings,
  method: string,
  subtotalCents: number,
) {
  if (
    !Object.hasOwn(SHIPPING_OPTIONS, method) ||
    !config.shipping[method as ShippingOption].enabled
  )
    throw new SettingsError(
      "This delivery option is unavailable. Choose another option.",
      409,
    );
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0)
    throw new SettingsError("Invalid subtotal.");
  return config.freeShippingThresholdCents !== null &&
    subtotalCents >= config.freeShippingThresholdCents
    ? 0
    : config.shipping[method as ShippingOption].feeCents;
}
export function usdEstimate(pesos: number, phpPerUsd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(pesos / phpPerUsd);
}
