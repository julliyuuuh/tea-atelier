import type { Product } from "@/lib/products";

export type Collection = {
  slug: string;
  name: string;
  // Other names the CMS may use for this collection.
  aliases?: string[];
  tagline: string;
  story: string;
  image: string;
  // Tailwind object-position for crops, when the subject isn't centred.
  imagePosition?: string;
  // Product categories that belong to this collection.
  categories: Product["category"][];
  ritual: { title: string; copy: string }[];
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "morning-ritual",
    name: "Morning Ritual",
    tagline: "Slow, golden mornings start with a well-brewed cup.",
    story:
      "Loose-leaf teas chosen for the first quiet hour of the day. Gentle enough to drink every morning, layered enough to notice something new in each cup.",
    image: "/images/mr-collections.png",
    categories: ["Leaf Tea"],
    ritual: [
      {
        title: "Warm the cup",
        copy: "Rinse your cup or teapot with hot water so the tea stays warm while it steeps.",
      },
      {
        title: "Steep with care",
        copy: "Use about 2–3 g of leaves for every 200 ml. Oolong and dark teas like water just off the boil; greens prefer it a little cooler.",
      },
      {
        title: "Take a quiet minute",
        copy: "Most leaves can be steeped two or three times. Each infusion opens up a little differently.",
      },
    ],
  },
  {
    slug: "matcha-moments",
    name: "Matcha Moments",
    tagline: "Vivid, stone-ground matcha for whisking, sipping and sharing.",
    story:
      "From ceremonial bowls to everyday lattes, these are the matchas we reach for most. Bright in colour, smooth on the palate and easy to make your own.",
    image: "/images/mm-collections.png",
    categories: ["Matcha"],
    ritual: [
      {
        title: "Sift",
        copy: "Sift 1–2 g of matcha into a bowl so it whisks up smooth, without clumps.",
      },
      {
        title: "Whisk",
        copy: "Add about 70 ml of water at around 80°C and whisk briskly in a zigzag until a fine foam forms.",
      },
      {
        title: "Make it yours",
        copy: "Enjoy it straight, or top with steamed milk over ice for a matcha latte.",
      },
    ],
  },
  {
    slug: "atelier-essentials",
    name: "The Atelier Essentials",
    aliases: ["Tea Accessories", "Accessories"],
    tagline:
      "The tools that make every cup easier, and every ritual a little more beautiful.",
    story:
      "Kettles, tins and teaware we use in the atelier every day. Thoughtfully made pieces that help you brew with precision and keep your tea at its best.",
    image: "/images/category-accessories.jpg",
    // keeps the photo's printed title at the top out of tight crops
    imagePosition: "object-bottom",
    categories: ["Accessories", "Tea Accessories"],
    ritual: [
      {
        title: "Mind the temperature",
        copy: "A temperature-controlled kettle takes the guesswork out of greens, oolongs and matcha.",
      },
      {
        title: "Measure the leaves",
        copy: "A consistent scoop means a consistent cup. Start with a little less and adjust to taste.",
      },
      {
        title: "Store it well",
        copy: "Keep tea in an airtight tin, away from light, heat and moisture, to protect its flavour.",
      },
    ],
  },
];

export function getCollection(slug: string) {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

export function inCollection(collection: Collection, product: Product) {
  return collection.categories.includes(product.category);
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/^the\s+/, "")
    .trim();

// CMS collection items carry their own link, which defaults to the shop. When
// it is one of those generic links, send the card to the matching collection.
const GENERIC_LINKS = ["", "#", "/collections", "/shop"];

export function collectionHref(name: string, href?: string | null) {
  if (!GENERIC_LINKS.includes((href ?? "").trim().replace(/\/+$/, ""))) {
    return href as string;
  }
  const match = COLLECTIONS.find((collection) =>
    [collection.name, ...(collection.aliases ?? [])].some(
      (candidate) => normalize(candidate) === normalize(name),
    ),
  );
  return match ? `/collections/${match.slug}` : href || "/collections";
}
