export const categoryTree = {
  "Leaf Tea": {
    "Green Tea": [
      "Sencha",
      "Matcha (Leaf Tea)",
      "Dragon Well (Longjing)",
      "Gunpowder Green Tea",
      "Jasmine Green Tea",
    ],
    "Black Tea": [
      "Assam Tea",
      "Ceylon Tea",
      "Darjeeling Tea",
      "English Breakfast Tea",
      "Earl Grey Tea",
    ],
    "Oolong Tea": [
      "Tieguanyin (Iron Goddess)",
      "Da Hong Pao",
      "Dong Ding Oolong",
      "Milk Oolong",
      "Oriental Beauty Tea",
    ],
  },
  Matcha: {
    "Ceremonial Matcha": [
      "Ceremonial Grade Matcha",
      "Uji Ceremonial Matcha",
      "Organic Ceremonial Matcha",
      "Premium Ceremonial Matcha",
      "First Harvest Matcha",
      "Stone-Ground Ceremonial Matcha",
    ],
    "Premium Matcha": [
      "Premium Grade Matcha",
      "Uji Premium Matcha",
      "Organic Premium Matcha",
    ],
    "Everyday Matcha": [
      "Daily Matcha Powder",
      "Café Blend Matcha",
      "Barista Matcha Powder",
    ],
    "Culinary Matcha": [
      "Culinary Grade Matcha",
      "Hojicha Matcha Powder",
      "Matcha Latte Powder",
      "Baking Matcha Powder",
      "Smoothie Matcha Powder",
      "Cooking Matcha Powder",
    ],
  },
  "Tea Accessories": {
    "Essential Matcha Tools": [
      "Chasen (Bamboo Whisk)",
      "Chashaku (Bamboo Scoop)",
      "Chawan (Matcha Bowl)",
      "Natsume (Tea Caddy)",
      "Chaire (Ceremonial Tea Caddy)",
      "Furui (Matcha Sifter)",
      "Kensui (Waste Water Bowl)",
      "Hishaku (Bamboo Ladle)",
      "Kama (Cast Iron Kettle)",
      "Futaoki (Lid Rest)",
    ],
    "Tea Brewing Tools": [
      "Tea Infuser",
      "Tea Strainer",
      "Teapot",
      "Electric Tea Kettle",
      "Tea Timer",
    ],
    "Tea Serving Accessories": [
      "Tea Cups",
      "Tea Mugs",
      "Tea Tray",
      "Tea Pitcher",
      "Tea Serving Set",
    ],
    "Tea Storage Accessories": [
      "Tea Tin Canister",
      "Tea Storage Jar",
      "Airtight Tea Container",
      "Tea Pouch with Zip Lock",
      "Bamboo Tea Box Organizer",
    ],
  },
} as const;

export type MainCategory = keyof typeof categoryTree;
export type SubCategory<C extends MainCategory> =
  keyof (typeof categoryTree)[C];
