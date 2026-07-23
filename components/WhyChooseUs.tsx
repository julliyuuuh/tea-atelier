"use client";

import { motion } from "framer-motion";

const reasons = [
  {
    number: "01",
    title: "Premium Quality",
    copy: "Hand-selected leaves, sourced at peak harvest for exceptional flavor.",
  },
  {
    number: "02",
    title: "Sustainable Sourcing",
    copy: "Partnering with growers who protect the land tea calls home.",
  },
  {
    number: "03",
    title: "Fast Delivery",
    copy: "Fresh from our atelier to your doorstep, without the wait.",
  },
  {
    number: "04",
    title: "Secure Payment",
    copy: "Every order protected with encrypted, trusted checkout.",
  },
];

export default function WhyChooseUs() {
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
            key={reason.number}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`px-6 py-8 md:py-0 ${
              i !== 0 ? "md:border-l border-charcoal/10" : ""
            }`}
          >
            <span className="font-display text-3xl text-sage">
              {reason.number}
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
