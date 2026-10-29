"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import { isOptimizableImage } from "@/lib/image-src";
import { COLLECTIONS } from "@/lib/collections";

interface Category {
  id: number;
  name: string;
  image: string;
  description: string;
  sort_order: number;
}

// Each storefront category has a matching collection page.
function categoryHref(name: string) {
  const match = COLLECTIONS.find((collection) =>
    collection.categories.some((category) => category === name),
  );
  return match ? `/collections/${match.slug}` : "/shop";
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
        <p className="font-body text-sm text-charcoal/70">
          Tap a card for details.
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
                className="relative w-full h-full"
                style={{
                  transformStyle: "preserve-3d",
                  WebkitTransformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.7s ease-out",
                }}
              >
                {/* Only the visible side is focusable; the other is inert. */}
                <button
                  type="button"
                  inert={isFlipped}
                  aria-expanded={isFlipped}
                  aria-label={`${cat.name}: show details`}
                  onClick={() => setFlippedIndex(i)}
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-sand text-left cursor-pointer"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    unoptimized={!isOptimizableImage(cat.image)}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                    <span className="font-display text-3xl text-white drop-shadow-sm">
                      {cat.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/90 px-3 py-1.5 font-body text-[11px] tracking-[0.15em] uppercase text-charcoal transition-colors group-hover:bg-sage group-hover:text-white">
                      <RotateCw aria-hidden="true" className="h-3 w-3" />
                      Details
                    </span>
                  </span>
                </button>

                <div
                  inert={!isFlipped}
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-charcoal flex flex-col justify-between p-8"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-body text-[11px] tracking-[0.2em] uppercase text-sage-light">
                        {cat.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setFlippedIndex(null)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cream/25 px-3 py-1.5 font-body text-[11px] tracking-[0.15em] uppercase text-cream/80 hover:border-cream hover:text-cream transition-colors"
                      >
                        <RotateCw
                          aria-hidden="true"
                          className="h-3 w-3 -scale-x-100"
                        />
                        Back
                      </button>
                    </div>
                    <p className="font-display italic text-2xl md:text-3xl leading-snug text-cream mt-4">
                      {cat.description}
                    </p>
                  </div>

                  <Link
                    href={categoryHref(cat.name)}
                    className="inline-flex items-center justify-center w-fit rounded-full bg-[#fdf6ed] text-[#1f2621] font-body text-xs tracking-[0.15em] uppercase px-7 py-3.5 hover:bg-sage-light transition-colors"
                  >
                    Shop {cat.name} →
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
