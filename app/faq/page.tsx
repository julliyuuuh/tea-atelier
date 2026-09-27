// app/faq/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFaq() {
      try {
        const res = await fetch("/api/cms/faq", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load FAQ.");
        setItems(data.items);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadFaq();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 pt-16 pb-24">
        <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block text-center">
          Questions
        </span>
        <h1 className="font-display text-5xl text-charcoal mb-14 text-center">
          Frequently Asked Questions
        </h1>

        <div className="divide-y divide-charcoal/10 border-t border-b border-charcoal/10">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between py-6 text-left"
                >
                  <span className="font-display text-lg text-charcoal pr-6">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-sage transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="font-body text-sm text-charcoal/70 leading-relaxed pb-6 pr-10">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}