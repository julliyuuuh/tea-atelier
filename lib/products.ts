export type Product = {
  id: string;
  name: string;
  category: "Leaf Tea" | "Matcha" | "Accessories" | "Tea Accessories";
  subCategory?: string | null;
  type?: string | null;
  price: number;
  unitsSold?: number;
  image: string;
  galleryImages?: string[];
  description: string;
  availability: "In Stock" | "Out of Stock";
  stockQuantity: number;
  isArchived: boolean;
};

export function isProductAvailable(product: Product) {
  return (
    !product.isArchived &&
    product.stockQuantity > 0 &&
    product.availability === "In Stock"
  );
}

// Urgency only when it's real: a handful left, not "10 or fewer".
export const LOW_STOCK_THRESHOLD = 3;

export function stockStatus(product: Product): {
  label: string;
  tone: "out" | "low" | "in";
} {
  if (!isProductAvailable(product))
    return { label: "Out of stock", tone: "out" };
  if (product.stockQuantity <= LOW_STOCK_THRESHOLD)
    return { label: `Only ${product.stockQuantity} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}
