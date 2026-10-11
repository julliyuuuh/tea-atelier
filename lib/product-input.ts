export const MAX_GALLERY_IMAGES = 5;

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
  const gallery = (body as Record<string, unknown>).galleryImages;
  if (gallery !== undefined) {
    if (!Array.isArray(gallery) || gallery.length > MAX_GALLERY_IMAGES)
      return `Add at most ${MAX_GALLERY_IMAGES} extra images.`;
    for (const image of gallery) {
      if (typeof image !== "string" || image.length > 2048)
        return "Gallery images must use valid HTTPS URLs.";
      try {
        const url = new URL(image);
        if (url.protocol !== "https:" || url.username || url.password)
          return "Gallery images must use valid HTTPS URLs.";
      } catch {
        return "Gallery images must use valid HTTPS URLs.";
      }
    }
    if (new Set(gallery).size !== gallery.length)
      return "Remove duplicate gallery images.";
  }
  return null;
}
