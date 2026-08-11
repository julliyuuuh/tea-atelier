"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const collections = [
  {
    name: "Morning Ritual",
    description: "Bright, energizing teas to start the day right.",
    image: "/images/mr-collections.png",
    href: "/shop?category=Leaf Tea",
  },
  {
    name: "Matcha Moments",
    description: "Stone-ground matcha for ceremony, lattes, and baking.",
    image: "/images/mm-collections.png",
    href: "/shop?category=Matcha",
  },
  {
    name: "The Atelier Essentials",
    description: "Everything you need to steep the perfect cup.",
    image: "/images/category-accessories.jpg",
    href: "/shop?category=Accessories",
  },
];

export default function CollectionsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 pt-16 pb-10 text-center">
        <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
          Curated
        </span>
        <h1 className="font-display text-5xl text-charcoal mb-4">
          Our Collections
        </h1>
        <p className="font-body text-charcoal/60 max-w-lg mx-auto">
          Thoughtfully grouped for however you like to steep — browse by mood,
          ritual, or occasion.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((col, i) => (
          <motion.div
            key={col.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link href={col.href} className="group block">
              <div className="relative h-80 rounded-2xl overflow-hidden bg-sand mb-4">
                <img
                  src={col.image}
                  alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="font-display text-xl text-charcoal mb-1">
                {col.name}
              </h3>
              <p className="font-body text-sm text-charcoal/60">
                {col.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      <Footer />
    </main>
  );
}
