export type Product = {
  id: string;
  name: string;
  category: "Leaf Tea" | "Matcha" | "Accessories";
  price: number;
  image: string;
  description: string;
  availability: "In Stock" | "Out of Stock";
};

export const products: Product[] = [
  {
    id: "da-hong-pao",
    name: "Da Hong Pao Tea",
    category: "Leaf Tea",
    price: 28,
    image: "/images/Da Hong Pao Tea.png",
    description:
      "A legendary rock oolong from the Wuyi Mountains, roasted for a deep, mineral-rich, smoky character.",
    availability: "In Stock",
  },
  {
    id: "matcha-tea",
    name: "Matcha Tea",
    category: "Leaf Tea",
    price: 24,
    image: "/images/Matcha Tea.png",
    description:
      "Stone-ground green tea leaves, vibrant and grassy, whisked into a smooth, energizing cup.",
    availability: "In Stock",
  },
  {
    id: "oolong-tea",
    name: "Oolong Tea",
    category: "Leaf Tea",
    price: 26,
    image: "/images/Oolong Tea.png",
    description:
      "A partially oxidized leaf tea balancing floral brightness with a warm, toasty finish.",
    availability: "In Stock",
  },
  {
    id: "hojicha-matcha-powder",
    name: "Hojicha Matcha Powder",
    category: "Matcha",
    price: 32,
    image: "/images/Hojicha matcha powder.jpg",
    description:
      "Roasted green tea powder with a nutty, caramel warmth — a cozy twist on traditional matcha.",
    availability: "In Stock",
  },
  {
    id: "baking-matcha-powder",
    name: "Baking Matcha Powder",
    category: "Matcha",
    price: 22,
    image: "/images/Baking matcha powder.jpg",
    description:
      "A robust culinary-grade matcha formulated to hold its color and flavor in baking and lattes.",
    availability: "In Stock",
  },
  {
    id: "electric-tea-kettle",
    name: "Electric Tea Kettle",
    category: "Accessories",
    price: 58,
    image: "/images/Electric Tea Kettle.png",
    description:
      "Precision temperature control for the perfect steep, every time — sleek, quiet, and fast to boil.",
    availability: "In Stock",
  },
];
