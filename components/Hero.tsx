"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import Link from "next/link";

const headlineLines: readonly string[] = ["Where Every Leaf", "Tells a Story"];

// Pinning the easing to Framer Motion's own Transition["ease"] type stops it
// from widening to `string`, which is what breaks the Variants assignment.
const EASE_OUT: Transition["ease"] = "easeOut";

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE_OUT,
      delay: 0.2 + i * 0.15,
    },
  }),
};

/** Three soft blurred wisps rising and fading — a quiet nod to steeping tea. */
function Steam(): React.JSX.Element {
  return (
    <div
      className="absolute -top-9 left-0 flex gap-2 pointer-events-none"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-8 rounded-full bg-sage/30 blur-[3px]"
          animate={{
            y: [0, -16, -30],
            opacity: [0, 0.55, 0],
            scaleY: [0.6, 1, 1.3],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: EASE_OUT,
            delay: i * 0.9,
          }}
        />
      ))}
    </div>
  );
}

export default function Hero(): React.JSX.Element {
  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-6">
        {/* Left: headline + CTA */}
        <div className="md:col-span-5 flex flex-col justify-center relative z-10 md:pr-4">
          <span className="relative font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 w-fit">
            <Steam />
            Tea Atelier
          </span>

          <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-charcoal mb-8">
            {headlineLines.map((line: string, i: number) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={lineVariants}
                  className="block"
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="font-body text-sm text-charcoal/60 mb-8 max-w-xs"
          >
            Single-origin leaves, hand-picked in Wuyishan and steeped in small
            batches.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
          >
            <Link
              href="/shop"
              className="group relative inline-block w-fit overflow-hidden bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4"
            >
              <span className="absolute inset-0 -translate-x-full bg-charcoal transition-transform duration-500 ease-out group-hover:translate-x-0" />
              <span className="relative">Shop Now</span>
            </Link>
          </motion.div>
        </div>

        {/* Right: layered bleed image */}
        <div className="md:col-span-7 relative">
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE_OUT }}
            className="relative aspect-[4/3] md:aspect-auto md:h-[600px] overflow-hidden bg-sand"
          >
            <img
              src="/images/hero.jpg"
              alt="Loose tea leaves and ceramic ware, Tea Atelier"
              className="w-full h-full object-cover"
            />

            {/* vertical edge label */}
            <span
              className="hidden md:block absolute top-8 right-6 font-body text-[10px] tracking-[0.3em] uppercase text-cream/80"
              style={{ writingMode: "vertical-rl" }}
            >
              Est. 2019 — Wuyishan
            </span>
          </motion.div>

          {/* overlapping foreground detail image — breaks the grid on purpose */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT }}
            className="hidden md:block absolute -bottom-10 -left-10 w-48 h-60 overflow-hidden shadow-xl ring-1 ring-cream"
          >
            <img
              src="/images/hero-detail.jpg"
              alt="Close-up of steeped tea in a ceramic cup"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <p className="mt-4 md:mt-14 md:ml-2 font-body text-[11px] tracking-wide text-charcoal/40">
            Photographed at our atelier, spring harvest
          </p>
        </div>
      </div>
    </section>
  );
}
