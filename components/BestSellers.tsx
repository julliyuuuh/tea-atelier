"use client";

import { motion } from "framer-motion";

const products = [
  {
    name: "Da Hong Pao Tea",
    category: "Leaf Tea",
    price: "$28",
    image: "/images/Da Hong Pao Tea.png",
    offset: "md:mt-0",
  },
  {
    name: "Matcha Tea",
    category: "Leaf Tea",
    price: "$24",
    image: "/images/Matcha Tea.png",
    offset: "md:mt-12",
  },
  {
    name: "Oolong Tea",
    category: "Leaf Tea",
    price: "$26",
    image: "/images/Oolong Tea.png",
    offset: "md:mt-0",
  },
  {
    name: "Hojicha Matcha Powder",
    category: "Matcha",
    price: "$32",
    image: "/images/Hojicha matcha powder.jpg",
    offset: "md:mt-12",
  },
  {
    name: "Baking Matcha Powder",
    category: "Matcha",
    price: "$22",
    image: "/images/Baking matcha powder.jpg",
    offset: "md:mt-0",
  },
  {
    name: "Electric Tea Kettle",
    category: "Accessories",
    price: "$58",
    image: "/images/Electric Tea Kettle.png",
    offset: "md:mt-12",
  },
];

export default function BestSellers() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Shop
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-12">
        Best Sellers
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
        {products.map((product) => (
          <motion.div
            key={product.name}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`group ${product.offset}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-sand mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                {product.category}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-charcoal mb-1">
                  {product.name}
                </h3>
                <span className="font-body text-sm text-charcoal/70">
                  {product.price}
                </span>
              </div>
              <button className="font-body text-xs tracking-wide uppercase border-b border-charcoal/40 pb-0.5 text-charcoal/80 hover:border-sage hover:text-sage hover:bg-sage/0 transition-colors px-1">
                Add to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
