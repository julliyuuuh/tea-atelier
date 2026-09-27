"use client";

import { useState, useEffect } from "react";
import { motion, type Transition } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

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
  const [hero, setHero] = useState<HeroData | null>(null);

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
        }
      }
    }

    loadHero();
    return () => controller.abort();
  }, []);

  if (!hero) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 pt-10 md:pt-14">
      <div className="flex items-baseline justify-between border-t border-b border-charcoal/20 py-3 font-body text-[11px] tracking-[0.25em] uppercase text-charcoal/60">
        <span>Tea Atelier</span>
        <span>{hero.volume_label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-charcoal/20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="md:col-span-5 flex flex-col justify-center py-16 md:py-24 md:pr-10"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-6">
            {hero.eyebrow}
          </span>

          <h1
            className="font-display text-4xl md:text-5xl leading-[1.15] text-charcoal mb-8
                      first-letter:text-7xl md:first-letter:text-8xl first-letter:font-display
                      first-letter:float-left first-letter:leading-[0.8] first-letter:pr-2
                      first-letter:text-sage"
          >
            {hero.heading}
          </h1>

          <p className="font-body text-sm leading-relaxed text-charcoal/60 mb-10 max-w-sm">
            {hero.subheading}
          </p>

          <Link
            href={hero.cta_link}
            className="group inline-flex items-center gap-2 w-fit font-body text-sm tracking-wide uppercase text-charcoal border-b border-charcoal pb-1"
          >
            {hero.cta_text}
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE_OUT }}
          className="md:col-span-7 relative py-10 md:py-16 md:pl-10"
        >
          <div className="relative aspect-[4/3] md:aspect-auto md:h-[540px] overflow-hidden bg-sand">
            <Image
              src={hero.image_url}
              alt="Loose tea leaves and ceramic ware, Tea Atelier"
              fill
              priority
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />

            <span className="absolute top-4 right-4 font-body text-xs tracking-widest text-cream/90">
              01
            </span>
          </div>

          <p className="mt-3 font-body text-[11px] tracking-wide text-charcoal/40 uppercase">
            {hero.image_caption}
          </p>
        </motion.div>
      </div>

      <div className="border-b border-charcoal/20" />
    </section>
  );
}