"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Reason {
  id: number;
  title: string;
  copy: string;
  sort_order: number;
}

export default function WhyChooseUs() {
  const [reasons, setReasons] = useState<Reason[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReasons() {
      try {
        const res = await fetch("/api/cms/why-choose-us", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load reasons.");
        setReasons(data.reasons);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadReasons();
    return () => controller.abort();
  }, []);

  if (reasons.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24 border-t border-charcoal/10">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Our Promise
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-12">
        Why Choose Tea Atelier
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4">
        {reasons.map((reason, i) => (
          <motion.div
            key={reason.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`px-6 py-8 md:py-0 ${
              i !== 0 ? "md:border-l border-charcoal/10" : ""
            }`}
          >
            <span className="font-display text-3xl text-sage">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="font-display text-xl text-charcoal mt-4 mb-2">
              {reason.title}
            </h3>
            <p className="font-body text-sm text-charcoal/70 leading-relaxed">
              {reason.copy}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}