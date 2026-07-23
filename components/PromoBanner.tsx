"use client";

import { motion } from "framer-motion";

export default function PromoBanner() {
  return (
    <section className="relative h-[480px] overflow-hidden">
      <img
        src="/images/promo.jpg"
        alt="Seasonal Collection"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* charcoal gradient overlay, darkest at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-8 flex flex-col justify-end pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage-light mb-3 block">
            Limited Time
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-cream mb-6 max-w-xl">
            The Autumn Harvest Collection
          </h2>

          <a
            href="/shop"
            className="inline-block w-fit bg-cream text-charcoal font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-sage hover:text-cream transition-colors"
          >
            Shop the Collection
          </a>
        </motion.div>
      </div>
    </section>
  );
}
