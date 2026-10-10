export type AddressInput = {
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  barangay: string | null;
};

export function parseAddress(body: Record<string, unknown>): AddressInput {
  function text(value: unknown, name: string, required = false) {
    if (value != null && typeof value !== "string")
      throw new Error(`${name} must be text.`);
    const result = typeof value === "string" ? value.trim() : "";
    if (required && !result) throw new Error(`${name} is required.`);
    if (result.length > 255)
      throw new Error(`${name} must be 255 characters or fewer.`);
    return result || null;
  }
  const barangay = text(body.barangay, "Barangay");
  if (body.street !== undefined) {
    const street = text(body.street, "Street", true)!;
    const city = text(body.city, "City", true)!;
    const province = text(body.province, "Province", true)!;
    const line2 = [...new Set([barangay, city, province].filter(Boolean))].join(
      ", ",
    );
    return {
      addressLine1: street,
      addressLine2: text(line2, "Address line 2"),
      addressLine3: null,
      barangay,
    };
  }
  return {
    addressLine1: text(body.addressLine1, "Address line 1", true)!,
    addressLine2: text(body.addressLine2, "Address line 2"),
    addressLine3: text(body.addressLine3, "Address line 3"),
    barangay,
  };
}

export function parseDefaults(body: Record<string, unknown>) {
  for (const key of ["defaultAddress", "defaultBilling"]) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") {
      throw new Error("Address defaults must be true or false.");
    }
  }
  return {
    shipping: body.defaultAddress as boolean | undefined,
    billing: body.defaultBilling as boolean | undefined,
  };
}

export function parseBillingDetails(body: Record<string, unknown>) {
  function optionalText(key: string, label: string, max: number) {
    if (body[key] === undefined) return undefined;
    if (body[key] === null) return null;
    if (typeof body[key] !== "string")
      throw new Error(`${label} must be text.`);
    const value = body[key].trim();
    if (value.length > max)
      throw new Error(`${label} must be ${max} characters or fewer.`);
    return value || null;
  }
  const businessName = optionalText("businessName", "Business name", 200);
  const billingContact = optionalText(
    "billingContact",
    "Billing name / contact",
    100,
  );
  const taxId = optionalText("taxId", "TIN", 32);
  if (
    taxId &&
    (!/^[\d -]+$/.test(taxId) ||
      ![9, 12].includes(taxId.replace(/[ -]/g, "").length))
  ) {
    throw new Error(
      "Enter a 9-digit TIN, or 12 digits including the branch code. Spaces and hyphens are allowed.",
    );
  }
  return { businessName, billingContact, taxId };
}

export function parseAddressLabel(
  body: Record<string, unknown>,
): string | null | undefined {
  if (body.addressLabel === undefined) return undefined;
  if (body.addressLabel === null) return null;
  if (typeof body.addressLabel !== "string")
    throw new Error("Address label must be text.");
  const label = body.addressLabel.trim();
  if (label.length > 40)
    throw new Error("Address label must be 40 characters or fewer.");
  return label || null;
}
