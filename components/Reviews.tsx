"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Review {
  id: number;
  quote: string;
  name: string;
  rating: number;
  sort_order: number;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviews() {
      try {
        const res = await fetch("/api/cms/reviews", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load reviews.");
        setReviews(data.reviews);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadReviews();
    return () => controller.abort();
  }, []);

  if (reviews.length === 0) return null;

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
            key={review.id}
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