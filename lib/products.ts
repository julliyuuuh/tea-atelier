export type Product = {
  id: string;
  name: string;
  category: "Leaf Tea" | "Matcha" | "Accessories" | "Tea Accessories";
  subCategory?: string | null;
  type?: string | null;
  price: number;
  unitsSold?: number;
  image: string;
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
