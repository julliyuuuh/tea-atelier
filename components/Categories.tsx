"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Leaf Tea",
    image: "/images/leaf-tea-ph.png",
    description:
      "Whole-leaf blends steeped slow, from first-flush greens to deep, malty oolongs.",
  },
  {
    name: "Matcha",
    image: "/images/matcha-ph.png",
    description:
      "Stone-ground ceremonial and culinary grades, whisked fresh from small Uji harvests.",
  },
  {
    name: "Tea Accessories",
    image: "/images/tea-accessories-ph.png",
    description:
      "Cast iron pots, hand-thrown cups, and the small tools that make the ritual worth keeping.",
  },
];

export default function Categories() {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Explore
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-10">
        Shop by Category
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat, i) => {
          const isFlipped = flippedIndex === i;

          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.08 }}
              className="group h-[420px] [perspective:1400px]"
            >
              {/* Tapping/clicking the card toggles the flip. State-driven
                  (not CSS hover) so it works the same on touch and desktop. */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isFlipped}
                aria-label={`${cat.name} — show details`}
                onClick={() => setFlippedIndex(isFlipped ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFlippedIndex(isFlipped ? null : i);
                  }
                }}
                className="relative w-full h-full cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  WebkitTransformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.7s ease-out",
                }}
              >
                {/* Front face — photo + label, same as before */}
                <div
                  className="absolute inset-0 overflow-hidden bg-sand"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-charcoal/10" />
                  <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                    {cat.name}
                  </span>
                </div>

                {/* Back face — blurb + CTA */}
                <div
                  className="absolute inset-0 bg-charcoal flex flex-col justify-between p-6"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div>
                    <span className="font-body text-[10px] tracking-[0.2em] uppercase text-sage">
                      {cat.name}
                    </span>
                    <p className="font-display italic text-2xl md:text-3xl leading-snug text-cream mt-4">
                      {cat.description}
                    </p>
                  </div>

                  <Link
                    href="/shop"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center w-fit bg-sage text-cream font-body text-xs tracking-wide uppercase px-6 py-3.5 hover:bg-cream hover:text-charcoal transition-colors"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
