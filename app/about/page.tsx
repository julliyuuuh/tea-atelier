"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 pt-16 pb-20 text-center">
        <motion.img
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          src="/images/logo-full.png"
          alt="Tea Atelier"
          className="w-56 mx-auto mb-10"
        />

        <h1 className="font-display text-4xl text-charcoal mb-6">Our Story</h1>
        <p className="font-body text-charcoal/70 leading-relaxed mb-6">
          Tea Atelier began with a simple belief: tea should be an experience,
          not just a drink. Every tin we pack, every leaf we source, is chosen
          to bring a small moment of ritual into your day.
        </p>
        <p className="font-body text-charcoal/70 leading-relaxed">
          From the misty slopes where our leaves are grown to the cup in your
          hands, we care about every step in between.
        </p>
      </div>

      <div className="bg-sand/30 py-20">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            {
              title: "Sustainable Sourcing",
              copy: "We partner with growers who protect the land tea calls home, using traditional and regenerative methods.",
            },
            {
              title: "Small Batch",
              copy: "Every tin is packed in small batches to preserve freshness and flavor at its peak.",
            },
            {
              title: "Est. 2026",
              copy: "A young atelier with an old soul — built on ritual, patience, and the pursuit of a perfect cup.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-xl text-charcoal mb-3">
                {item.title}
              </h3>
              <p className="font-body text-sm text-charcoal/60 leading-relaxed">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
