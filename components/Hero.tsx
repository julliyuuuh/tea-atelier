"use client";

import { useState, useEffect } from "react";
import { motion, type Transition } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { SkeletonBlock } from "@/components/Skeleton";
import { isOptimizableImage } from "@/lib/image-src";

const EASE_OUT: Transition["ease"] = "easeOut";

interface HeroData {
  volume_label: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  image_caption: string;
}

export default function Hero(): React.JSX.Element | null {
  // undefined while loading, null if the hero could not be loaded
  const [hero, setHero] = useState<HeroData | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHero() {
      try {
        const res = await fetch("/api/cms/hero", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load hero.");
        setHero(data.hero);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
          setHero(null);
        }
      }
    }

    loadHero();
    return () => controller.abort();
  }, []);

  if (hero === undefined) return <HeroSkeleton />;
  if (!hero) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 pt-6 md:pt-10">
      <div className="grid grid-cols-1 md:grid-cols-12 md:items-center md:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="md:col-span-5 flex flex-col justify-center pt-10 pb-12 md:py-20"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-6">
            {hero.eyebrow}
          </span>

          <h1 className="font-display text-[2.75rem] md:text-6xl leading-[1.05] tracking-tight text-charcoal mb-6 text-balance">
            {hero.heading}
          </h1>

          <p className="font-body text-base leading-relaxed text-charcoal/70 mb-10 max-w-md">
            {hero.subheading}
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <Link
              href={hero.cta_link}
              className="group inline-flex items-center gap-3 rounded-full bg-charcoal text-cream font-body text-xs tracking-[0.15em] uppercase px-8 py-4 shadow-sm hover:bg-sage transition-colors"
            >
              {hero.cta_text}
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/about"
              className="font-body text-xs tracking-[0.15em] uppercase text-charcoal/70 border-b border-charcoal/30 pb-1 hover:text-sage hover:border-sage transition-colors"
            >
              Our Story
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE_OUT }}
          className="md:col-span-7 relative pb-10 md:py-10"
        >
          <div className="group relative aspect-[4/3] md:aspect-auto md:h-[560px] overflow-hidden rounded-3xl bg-sand">
            <Image
              src={hero.image_url}
              alt={hero.image_caption || "Loose tea leaves and ceramic ware"}
              fill
              fetchPriority="high"
              unoptimized={!isOptimizableImage(hero.image_url)}
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-[1.03]"
            />
            {hero.volume_label && (
              <span className="absolute top-5 left-5 rounded-full bg-cream/90 px-4 py-1.5 font-body text-[11px] tracking-[0.2em] uppercase text-charcoal backdrop-blur">
                {hero.volume_label}
              </span>
            )}
          </div>

          <p className="mt-3 px-1 font-body text-[11px] tracking-[0.15em] text-charcoal/70 uppercase">
            {hero.image_caption}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Mirrors the hero's layout so the page doesn't jump when the content arrives.
function HeroSkeleton() {
  return (
    <section
      className="max-w-7xl mx-auto px-8 pt-6 md:pt-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 md:items-center md:gap-12">
        <div className="md:col-span-5 flex flex-col justify-center gap-6 pt-10 pb-12 md:py-20">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-3/4" />
          <SkeletonBlock className="h-16 w-full max-w-md" />
          <SkeletonBlock className="h-12 w-52 rounded-full" />
        </div>
        <div className="md:col-span-7 pb-10 md:py-10">
          <SkeletonBlock className="aspect-[4/3] md:aspect-auto md:h-[560px] w-full rounded-3xl" />
        </div>
      </div>
    </section>
  );
}
