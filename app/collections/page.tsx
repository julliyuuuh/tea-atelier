"use client";

import { useState, useEffect } from "react";
import { motion, MotionConfig } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CollectionCard from "@/components/CollectionCard";
import { SkeletonBlock } from "@/components/Skeleton";
import { COLLECTIONS, collectionHref, getCollection } from "@/lib/collections";

interface Intro {
  eyebrow: string;
  heading: string;
  subheading: string;
}

interface CollectionItem {
  id: number;
  name: string;
  description: string;
  image: string;
  href: string;
}

// The original text-only artwork; cards still using it get the collection photo.
const PLACEHOLDER_ART = [
  "/images/morning-ritual.png",
  "/images/matcha-moments.png",
  "/images/tea-acc.png",
];

const FALLBACK_ITEMS: CollectionItem[] = COLLECTIONS.map((collection, i) => ({
  id: -1 - i,
  name: collection.name,
  description: collection.tagline,
  image: collection.image,
  href: `/collections/${collection.slug}`,
}));

function cardFor(item: CollectionItem): {
  href: string;
  image: string;
  imagePosition?: string;
} {
  const href = collectionHref(item.name, item.href);
  const known = getCollection(href.replace(/^\/collections\//, ""));
  if (known && (!item.image || PLACEHOLDER_ART.includes(item.image)))
    return { href, image: known.image, imagePosition: known.imagePosition };
  return { href, image: item.image };
}

export default function CollectionsPage() {
  const [intro, setIntro] = useState<Intro | null>(null);
  // null while loading
  const [items, setItems] = useState<CollectionItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      try {
        const [introRes, itemsRes] = await Promise.all([
          fetch("/api/cms/collections-intro", { signal: controller.signal }),
          fetch("/api/cms/collections-items", { signal: controller.signal }),
        ]);
        const [introData, itemsData] = await Promise.all([
          introRes.json(),
          itemsRes.json(),
        ]);
        setIntro(introData.intro);
        setItems(
          Array.isArray(itemsData.items) && itemsData.items.length > 0
            ? itemsData.items
            : FALLBACK_ITEMS,
        );
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
          setItems(FALLBACK_ITEMS);
        }
      }
    }

    loadAll();
    return () => controller.abort();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen">
        <Navbar />

        <div className="max-w-3xl mx-auto px-8 pt-16 pb-12 text-center">
          {items === null ? (
            <div
              className="flex flex-col items-center gap-4"
              aria-hidden="true"
            >
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-14 w-full max-w-lg" />
              <SkeletonBlock className="h-5 w-full max-w-md" />
            </div>
          ) : (
            <>
              <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
                {intro?.eyebrow || "Collections"}
              </span>
              <h1 className="font-display text-4xl md:text-6xl leading-tight text-charcoal mb-5">
                {intro?.heading || "Curated for every ritual"}
              </h1>
              <p className="font-body text-base leading-relaxed text-charcoal/65 max-w-xl mx-auto">
                {intro?.subheading ||
                  "Small, considered edits of our teas and tools, each built around a moment in your day."}
              </p>
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-8 pb-24 grid grid-cols-1 gap-6 md:grid-cols-2">
          {items === null
            ? [0, 1, 2].map((i) => (
                <SkeletonBlock
                  key={i}
                  className={`rounded-2xl ${i === 0 ? "h-[420px] md:col-span-2" : "h-80"}`}
                />
              ))
            : items.map((item, i) => {
                const card = cardFor(item);
                const featured = i === 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
                    className={featured ? "md:col-span-2" : ""}
                  >
                    <CollectionCard
                      href={card.href}
                      name={item.name}
                      tagline={item.description}
                      image={card.image}
                      imagePosition={card.imagePosition}
                      headingLevel="h2"
                      className={featured ? "h-[420px]" : "h-80"}
                      sizes={
                        featured
                          ? "(min-width: 1280px) 1216px, 100vw"
                          : "(min-width: 768px) 50vw, 100vw"
                      }
                    />
                  </motion.div>
                );
              })}
        </div>

        <Footer />
      </main>
    </MotionConfig>
  );
}
