"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const categories = [
  {
    name: "Leaf Tea",
    image: "/images/category-leaf.jpg",
    description:
      "Whole-leaf teas hand-picked at peak harvest — from delicate greens to bold oolongs.",
  },
  {
    name: "Matcha",
    image: "/images/category-matcha.jpg",
    description:
      "Stone-ground ceremonial and culinary matcha, vibrant and smooth in every whisk.",
  },
  {
    name: "Tea Accessories",
    image: "/images/category-accessories.jpg",
    description:
      "Kettles, infusers, and tools designed to make every steep effortless.",
  },
];

function FlipCard({ category }: { category: (typeof categories)[number] }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative h-[420px] rounded-2xl [perspective:1200px] cursor-pointer"
      onClick={() => setFlipped(!flipped)}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front */}
        <div className="absolute inset-0 rounded-2xl [backface-visibility:hidden] overflow-hidden bg-sand">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 left-4 bg-cream/90 rounded-full px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
            {category.name}
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl [backface-visibility:hidden] bg-charcoal text-cream flex flex-col justify-center px-8"
          style={{ transform: "rotateY(180deg)" }}
        >
          <h3 className="font-display text-2xl mb-4">{category.name}</h3>
          <p className="font-body text-sm text-cream/70 leading-relaxed mb-6">
            {category.description}
          </p>
          <Link
            href="/shop"
            className="inline-block w-fit rounded-full bg-sage text-cream font-body text-xs tracking-wide uppercase px-6 py-3 hover:bg-cream hover:text-charcoal transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

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
          <FlipCard key={cat.name} category={cat} />
        ))}
      </div>
    </section>
  );
}
