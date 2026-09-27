"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Intro {
  eyebrow: string;
  heading: string;
  subheading: string;
}

interface CollectionItem {
  id: number;
  name: string;
  description: string;
  image: string;
  href: string;
}

export default function CollectionsPage() {
  const [intro, setIntro] = useState<Intro | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      try {
        const [introRes, itemsRes] = await Promise.all([
          fetch("/api/cms/collections-intro", { signal: controller.signal }),
          fetch("/api/cms/collections-items", { signal: controller.signal }),
        ]);
        const [introData, itemsData] = await Promise.all([
          introRes.json(),
          itemsRes.json(),
        ]);
        setIntro(introData.intro);
        setItems(itemsData.items);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadAll();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      {intro && (
        <div className="max-w-7xl mx-auto px-8 pt-16 pb-10 text-center">
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
            {intro.eyebrow}
          </span>
          <h1 className="font-display text-5xl text-charcoal mb-4">
            {intro.heading}
          </h1>
          <p className="font-body text-charcoal/60 max-w-lg mx-auto">
            {intro.subheading}
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((col, i) => (
          <motion.div
            key={col.id}
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