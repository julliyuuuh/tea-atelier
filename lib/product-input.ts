export function productInputError(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Invalid product details.";
  const { name, description, price, stockQuantity } = body as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || !name.trim()) return "Name is required.";
  if (typeof description !== "string" || !description.trim())
    return "Description is required.";
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 9999999999.99 ||
    Math.abs(price * 100 - Math.round(price * 100)) > 0.0001
  )
    return "Enter a positive price with at most two decimal places.";
  if (
    typeof stockQuantity !== "number" ||
    !Number.isSafeInteger(stockQuantity) ||
    stockQuantity < 0 ||
    stockQuantity > 2147483647
  )
    return "Stock quantity must be a non-negative whole number.";
  return null;
}
