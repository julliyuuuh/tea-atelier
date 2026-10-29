"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import { isOptimizableImage } from "@/lib/image-src";

interface Category {
  id: number;
  name: string;
  image: string;
  description: string;
  sort_order: number;
}

export default function Categories() {
  // null while loading
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const res = await fetch("/api/cms/categories", {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Unable to load categories.");
        setCategories(data.categories);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
          setCategories([]);
        }
      }
    }

    loadCategories();
    return () => controller.abort();
  }, []);

  if (categories?.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Explore
      </span>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <h2 className="font-display text-4xl text-charcoal">
          Shop by Category
        </h2>
        <p className="font-body text-sm text-charcoal/60">
          Tap a card to learn more.
        </p>
      </div>

      {categories === null && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-[420px] rounded-2xl" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories?.map((cat, i) => {
          const isFlipped = flippedIndex === i;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.08 }}
              className="group h-[420px] [perspective:1400px]"
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isFlipped}
                aria-label={`${cat.name}, show details`}
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
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-sand"
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
                    unoptimized={!isOptimizableImage(cat.image)}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                    <span className="font-display text-3xl text-white drop-shadow-sm">
                      {cat.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/90 px-3 py-1.5 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal transition-colors group-hover:bg-sage group-hover:text-white">
                      <RotateCw aria-hidden="true" className="h-3 w-3" />
                      Details
                    </span>
                  </div>
                </div>

                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-charcoal flex flex-col justify-between p-8"
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
                    className="inline-flex items-center justify-center w-fit rounded-full bg-sage text-cream font-body text-xs tracking-[0.15em] uppercase px-7 py-3.5 hover:bg-cream hover:text-charcoal transition-colors"
                  >
                    Shop Now →
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
