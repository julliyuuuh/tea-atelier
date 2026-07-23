"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="bg-sand/40 border-t border-charcoal/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="max-w-xl mx-auto px-8 py-20 text-center"
      >
        <h2 className="font-display text-3xl text-charcoal mb-3">
          Stay Steeped In
        </h2>
        <p className="font-body text-sm text-charcoal/70 mb-8">
          New arrivals, seasonal blends, and stories from the atelier — straight
          to your inbox.
        </p>

        {submitted ? (
          <p className="font-body text-sm text-sage">
            Thank you — you're on the list.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-center justify-center gap-4 border-b border-charcoal/30 pb-2 max-w-sm mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 bg-transparent font-body text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none"
            />
            <button
              type="submit"
              className="font-body text-sm text-charcoal hover:text-sage transition-colors"
            >
              →
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
