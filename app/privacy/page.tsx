// app/privacy/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Intro {
  heading: string;
  intro: string;
  last_updated: string;
}

interface Section {
  id: number;
  heading: string;
  body: string;
}

export default function PrivacyPage() {
  const [intro, setIntro] = useState<Intro | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      try {
        const introRes = await fetch("/api/cms/privacy-intro", { signal: controller.signal });
        const introData = await introRes.json();
        if (introRes.ok) setIntro(introData.intro);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") console.error(error.message);
      }

      try {
        const sectionsRes = await fetch("/api/cms/privacy-sections", { signal: controller.signal });
        const sectionsData = await sectionsRes.json();
        if (sectionsRes.ok) setSections(sectionsData.sections);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") console.error(error.message);
      }
    }

    loadAll();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 pt-16 pb-24">
        {intro && (
          <div className="text-center mb-14">
            <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
              Legal
            </span>
            <h1 className="font-display text-5xl text-charcoal mb-4">
              {intro.heading}
            </h1>
            <p className="font-body text-xs tracking-wide uppercase text-charcoal/40 mb-6">
              Last updated {intro.last_updated}
            </p>
            <p className="font-body text-charcoal/70 leading-relaxed max-w-xl mx-auto">
              {intro.intro}
            </p>
          </div>
        )}

        <div className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {sections.map((section, i) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="py-8"
            >
              <h2 className="font-display text-xl text-charcoal mb-3">
                <span className="text-sage mr-2">{String(i + 1).padStart(2, "0")}</span>
                {section.heading}
              </h2>
              <p className="font-body text-sm text-charcoal/70 leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </motion.section>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}