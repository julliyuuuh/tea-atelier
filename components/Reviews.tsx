"use client";

import { motion } from "framer-motion";

const reviews = [
  {
    quote:
      "The Da Hong Pao completely changed how I think about tea. Rich, smoky, unforgettable.",
    name: "Amara L.",
    rating: 5,
  },
  {
    quote:
      "Packaging alone feels like a gift. The matcha is silky and vibrant every time.",
    name: "Julien P.",
    rating: 5,
  },
  {
    quote:
      "Fast shipping, beautiful tins, and the oolong is now a daily ritual for me.",
    name: "Priya S.",
    rating: 4,
  },
];

export default function Reviews() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24 border-t border-charcoal/10">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Testimonials
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-14">
        What Our Customers Say
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-14">
        {reviews.map((review, i) => (
          <motion.div
            key={review.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
            className={i === 1 ? "md:mt-10" : ""}
          >
            <p className="font-display italic text-2xl text-charcoal leading-snug mb-6">
              “{review.quote}”
            </p>
            <div className="flex items-center gap-3">
              <span className="font-body text-xs tracking-[0.15em] uppercase text-charcoal/70">
                {review.name}
              </span>
              <span className="font-body text-sm text-sage">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
