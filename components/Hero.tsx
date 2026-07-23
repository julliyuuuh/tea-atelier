"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-8 py-16 md:py-24">
      {/* Left: headline + CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="md:col-span-1 flex flex-col justify-center"
      >
        <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4">
          Tea Atelier
        </span>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-charcoal mb-8">
          Where Every Leaf Tells a Story
        </h1>

        <a
          href="/shop"
          className="inline-block w-fit bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
        >
          Shop Now
        </a>
      </motion.div>

      {/* Right: large bleed image */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="md:col-span-2 relative aspect-[4/3] md:aspect-auto md:h-[600px] overflow-hidden bg-sand"
      >
        <img
          src="/images/hero.jpg"
          alt="Tea Atelier"
          className="w-full h-full object-cover"
        />
      </motion.div>
    </section>
  );
}
