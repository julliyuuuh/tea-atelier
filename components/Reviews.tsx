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

// Ratings come from the CMS; keep them a whole number between 0 and 5.
const stars = (rating: number) =>
  Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviews() {
      try {
        const res = await fetch("/api/cms/reviews", {
          signal: controller.signal,
        });
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
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Testimonials
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-14">
        What Our Customers Say
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, i) => (
          <motion.figure
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
            className="flex flex-col rounded-2xl border border-charcoal/10 bg-sand/25 p-8"
          >
            <span
              aria-hidden="true"
              className="block font-display text-6xl leading-none text-sage/40 -mb-4"
            >
              “
            </span>
            <blockquote className="flex-1 font-display italic text-xl md:text-2xl text-charcoal leading-snug mb-8">
              {review.quote}
            </blockquote>
            <figcaption className="flex items-center justify-between gap-3 border-t border-charcoal/10 pt-5">
              <span className="font-body text-xs tracking-[0.15em] uppercase text-charcoal/70">
                {review.name}
              </span>
              <span
                role="img"
                aria-label={`Rated ${stars(review.rating)} out of 5`}
                className="font-body text-sm text-sage"
              >
                {"★".repeat(stars(review.rating))}
                {"☆".repeat(5 - stars(review.rating))}
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
