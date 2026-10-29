"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { isOptimizableImage } from "@/lib/image-src";

interface PromoData {
  label: string;
  heading: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
}

export default function PromoBanner() {
  const [promo, setPromo] = useState<PromoData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPromo() {
      try {
        const res = await fetch("/api/cms/promo", {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load promo.");
        setPromo(data.promo);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadPromo();
    return () => controller.abort();
  }, []);

  if (!promo) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-8">
      <div className="relative h-[460px] overflow-hidden rounded-3xl">
        <Image
          src={promo.image_url}
          alt=""
          fill
          sizes="100vw"
          unoptimized={!isOptimizableImage(promo.image_url)}
          className="object-cover"
        />
        {/* charcoal turns light in dark mode, so the scrim behind the text is black */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="relative h-full px-8 md:px-14 flex flex-col justify-end pb-12 md:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="font-body text-xs tracking-[0.2em] uppercase text-sage-light mb-3 block">
              {promo.label}
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-cream mb-6 max-w-xl">
              {promo.heading}
            </h2>

            <Link
              href={promo.cta_link}
              className="group inline-flex items-center gap-3 w-fit rounded-full bg-cream text-charcoal font-body text-xs tracking-[0.15em] uppercase px-8 py-4 hover:bg-sage hover:text-cream transition-colors"
            >
              {promo.cta_text}
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
