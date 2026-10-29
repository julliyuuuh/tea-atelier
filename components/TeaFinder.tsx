"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gem,
  GlassWater,
  Leaf,
  Moon,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import DisplayPrice from "@/components/DisplayPrice";
import { useCart } from "@/lib/cart-context";
import { getCollection, inCollection } from "@/lib/collections";
import { isProductAvailable, type Product } from "@/lib/products";

type Option = { id: string; label: string; hint: string; icon: LucideIcon };

const QUESTIONS: { title: string; options: Option[] }[] = [
  {
    title: "When is your tea moment?",
    options: [
      {
        id: "morning",
        label: "Slow mornings",
        hint: "A calm first cup",
        icon: Sunrise,
      },
      {
        id: "afternoon",
        label: "Afternoon lift",
        hint: "Something bright",
        icon: Sun,
      },
      {
        id: "evening",
        label: "Winding down",
        hint: "Gentle and cosy",
        icon: Moon,
      },
    ],
  },
  {
    title: "How do you like it?",
    options: [
      {
        id: "whisked",
        label: "Whisked & vivid",
        hint: "Frothy matcha",
        icon: Sparkles,
      },
      {
        id: "steeped",
        label: "Steeped & soothing",
        hint: "Loose leaves",
        icon: Leaf,
      },
      {
        id: "latte",
        label: "Iced or with milk",
        hint: "Lattes, my way",
        icon: GlassWater,
      },
    ],
  },
  {
    title: "Where are you on your tea journey?",
    options: [
      {
        id: "new",
        label: "Just starting",
        hint: "Show me the basics",
        icon: Sprout,
      },
      {
        id: "daily",
        label: "Daily sipper",
        hint: "I know what I like",
        icon: Leaf,
      },
      {
        id: "collector",
        label: "Collector",
        hint: "Always exploring",
        icon: Gem,
      },
    ],
  },
];

const MOMENT_COPY: Record<string, string> = {
  morning: "for slow, golden mornings",
  afternoon: "for a bright afternoon lift",
  evening: "for winding down gently",
};

const STYLE_COPY: Record<string, string> = {
  whisked: "Whisk it bright and frothy, just the way you like it.",
  steeped: "Steep a pot and let each infusion open up a little differently.",
  latte: "Whisk a little matcha, then pour it over milk and ice.",
};

export default function TeaFinder() {
  const [answers, setAnswers] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const { addToCart } = useCart();
  const step = answers.length;
  const done = step === QUESTIONS.length;

  const collection = getCollection(
    answers[1] === "steeped" ? "morning-ritual" : "matcha-moments",
  )!;

  async function choose(id: string) {
    const next = [...answers, id];
    setAnswers(next);
    if (next.length < QUESTIONS.length) return;
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) throw new Error();
      const match = getCollection(
        next[1] === "steeped" ? "morning-ritual" : "matcha-moments",
      )!;
      setProducts(
        (data.products as Product[])
          .filter((p) => !p.isArchived && inCollection(match, p))
          .sort(
            (a, b) =>
              Number(isProductAvailable(b)) - Number(isProductAvailable(a)),
          )
          .slice(0, 3),
      );
    } catch {
      setProducts([]);
    }
  }

  function restart() {
    setAnswers([]);
    setProducts(null);
  }

  return (
    <section
      aria-labelledby="tea-finder-title"
      className="max-w-7xl mx-auto px-8 py-8"
    >
      <div className="overflow-hidden rounded-3xl bg-charcoal text-cream">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 p-8 md:p-12 border-b border-cream/10 lg:border-b-0 lg:border-r">
            <span className="font-body text-xs tracking-[0.2em] uppercase text-sage-light mb-4 block">
              Tea finder
            </span>
            <h2
              id="tea-finder-title"
              className="font-display text-3xl md:text-4xl leading-tight mb-4"
            >
              Not sure where to start?
            </h2>
            <p className="font-body text-sm leading-relaxed text-cream/70 mb-8">
              Three quick questions and we&apos;ll pour you a recommendation.
            </p>
            <ol className="flex gap-2" aria-label="Progress">
              {QUESTIONS.map((q, i) => (
                <li
                  key={q.title}
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    i < step ? "bg-sage-light" : "bg-cream/15"
                  }`}
                >
                  <span className="sr-only">
                    Question {i + 1}
                    {i < step ? ", answered" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-8 p-8 md:p-12 min-h-[340px]">
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="font-body text-xs text-cream/60 mb-2">
                    Question {step + 1} of {QUESTIONS.length}
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl mb-8">
                    {QUESTIONS[step].title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {QUESTIONS[step].options.map(
                      ({ id, label, hint, icon: Icon }) => (
                        <motion.button
                          key={id}
                          type="button"
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => void choose(id)}
                          className="group flex flex-col items-start gap-4 rounded-2xl border border-cream/15 bg-cream/5 p-5 text-left transition-colors hover:border-sage-light hover:bg-cream/10"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/10 text-sage-light transition-colors group-hover:bg-sage-light group-hover:text-[#1f2621]">
                            <Icon
                              aria-hidden="true"
                              strokeWidth={1.5}
                              className="h-5 w-5"
                            />
                          </span>
                          <span>
                            <span className="block font-display text-lg">
                              {label}
                            </span>
                            <span className="block font-body text-xs text-cream/60">
                              {hint}
                            </span>
                          </span>
                        </motion.button>
                      ),
                    )}
                  </div>
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setAnswers(answers.slice(0, -1))}
                      className="mt-6 font-body text-xs text-cream/60 underline underline-offset-2 hover:text-cream"
                    >
                      Back
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  aria-live="polite"
                >
                  <p className="font-body text-xs text-sage-light mb-2">
                    Your match
                  </p>
                  <h3 className="font-display text-3xl md:text-4xl mb-2">
                    {collection.name}
                  </h3>
                  <p className="font-body text-sm text-cream/70 mb-8 max-w-lg">
                    A good fit {MOMENT_COPY[answers[0]]}.{" "}
                    {STYLE_COPY[answers[1]]}
                  </p>

                  {products === null ? (
                    <p
                      role="status"
                      className="font-body text-sm text-cream/60"
                    >
                      Steeping your picks…
                    </p>
                  ) : products.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                      {products.map((product, i) => (
                        <motion.li
                          key={product.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                          className="flex flex-col rounded-2xl bg-cream/5 border border-cream/10 p-3"
                        >
                          <Link
                            href={`/shop/${product.id}`}
                            className="flex items-center gap-3"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- product images can come from any CMS host */}
                            <img
                              src={product.image}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-xl object-cover bg-cream/10"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-display text-base">
                                {product.name}
                              </span>
                              <span className="block font-body text-xs text-cream/70">
                                <DisplayPrice pesos={Number(product.price)} />
                              </span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            disabled={!isProductAvailable(product)}
                            onClick={() => addToCart(product)}
                            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#fdf6ed] py-2 font-body text-xs text-[#1f2621] hover:bg-sage-light transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ShoppingBag size={13} aria-hidden="true" />
                            {isProductAvailable(product)
                              ? "Add to cart"
                              : "Out of stock"}
                          </button>
                        </motion.li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#fdf6ed] px-7 py-3.5 font-body text-sm text-[#1f2621] hover:bg-sage-light transition-colors"
                    >
                      Explore {collection.name} →
                    </Link>
                    {answers[2] === "new" && (
                      <Link
                        href="/collections/atelier-essentials"
                        className="inline-flex items-center rounded-full border border-cream/25 px-7 py-3.5 font-body text-sm text-cream hover:border-cream transition-colors"
                      >
                        Starter tools
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex items-center gap-2 px-3 py-3.5 font-body text-sm text-cream/70 hover:text-cream"
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      Start over
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
