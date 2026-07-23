"use client";

import { motion } from "framer-motion";

const categories = [
  { name: "Leaf Tea", image: "/images/category-leaf.jpg" },
  { name: "Matcha", image: "/images/category-matcha.jpg" },
  { name: "Tea Accessories", image: "/images/category-accessories.jpg" },
];

export default function Categories() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Explore
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-10">
        Shop by Category
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <motion.a
            href="#"
            key={cat.name}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative h-[420px] overflow-hidden bg-sand block group"
          >
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-charcoal/10 group-hover:bg-charcoal/20 transition-colors" />

            <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
              {cat.name}
            </span>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
