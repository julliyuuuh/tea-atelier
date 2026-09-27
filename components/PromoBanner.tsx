"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
        const res = await fetch("/api/cms/promo", { signal: controller.signal });
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
    <section className="relative h-[480px] overflow-hidden">
      <img
        src={promo.image_url}
        alt="Seasonal Collection"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-8 flex flex-col justify-end pb-16">
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

          <a
            href={promo.cta_link}
            className="inline-block w-fit bg-cream text-charcoal font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-sage hover:text-cream transition-colors"
          >
            {promo.cta_text}
          </a>
        </motion.div>
      </div>
    </section>
  );
}