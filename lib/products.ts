export type Product = {
  id: string;
  name: string;
  category: "Leaf Tea" | "Matcha" | "Accessories";
  price: number;
  image: string;
  description: string;
  availability: "In Stock" | "Out of Stock";
  stockQuantity: number;
  isArchived: boolean;
};