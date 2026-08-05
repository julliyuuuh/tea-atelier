"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";
import Link from "next/link";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Product not found.");
        setProduct(data.product as Product);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
    return () => controller.abort();
  }, [id]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">Loading...</p>
      </main>
    );
  }

  if (errorMessage || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">
          {errorMessage || "Product not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 pt-8">
        <span className="font-body text-xs text-charcoal/50">
          <Link href="/shop" className="hover:text-charcoal transition-colors">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-charcoal">{product.name}</span>
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-16">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-sand"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4">
            {product.category}
          </span>
          <h1 className="font-display text-4xl text-charcoal mb-4">
            {product.name}
          </h1>
          <span className="font-body text-2xl text-charcoal/80 mb-6">
            ₱{product.price}
          </span>
          <p className="font-body text-sm text-charcoal/70 leading-relaxed mb-8">
            {product.description}
          </p>

          <span className="font-body text-xs uppercase tracking-wide mb-8">
            {product.stockQuantity === 0 ? (
              <span className="text-charcoal/40">Out of Stock</span>
            ) : product.stockQuantity <= 10 ? (
              <span className="text-amber-600">Low Stock</span>
            ) : (
              <span className="text-sage">In Stock</span>
            )}
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border border-charcoal/20 overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                −
              </button>
              <span className="px-4 font-body text-sm text-charcoal">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => addToCart(product, quantity)}
              className="flex-1 rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </motion.div>
      </div>

      {/* Accordion + Reviews Section */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Accordion */}
          <div className="border-t border-charcoal/10">
            <AccordionRow title="Shipping Information">
              Orders are processed within 1-2 business days and typically arrive
              within 3-5 business days via standard delivery. Free shipping on
              orders over ₱1,500.
            </AccordionRow>
            <AccordionRow title="Materials & Care">
              Store in a cool, dry place away from direct sunlight. Reseal
              tightly after each use to preserve freshness and aroma.
            </AccordionRow>
            <AccordionRow title="30-Day Guarantee">
              Not satisfied? We offer a 30-day money-back guarantee on all
              unopened products.
            </AccordionRow>
          </div>

          {/* Ratings & Reviews */}
          <div>
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Ratings & Reviews
            </h2>

            <div className="flex items-center gap-4 mb-6">
              <span className="font-display text-4xl text-charcoal">4.8</span>
              <div>
                <div className="flex text-sage mb-1">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <span className="font-body text-xs text-charcoal/50">
                  Based on 24 reviews
                </span>
              </div>
            </div>

            <div className="space-y-1.5 mb-8">
              {[
                { stars: 5, count: 18 },
                { stars: 4, count: 4 },
                { stars: 3, count: 1 },
                { stars: 2, count: 0 },
                { stars: 1, count: 1 },
              ].map((row) => (
                <div key={row.stars} className="flex items-center gap-3">
                  <span className="font-body text-xs text-charcoal/50 w-10">
                    {row.stars} star
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-sand/60 overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${(row.count / 24) * 100}%` }}
                    />
                  </div>
                  <span className="font-body text-xs text-charcoal/40 w-6 text-right">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {[
                {
                  name: "Amara L.",
                  stars: 5,
                  text: "Rich, smoky, and perfectly balanced. This is now a weekly staple in my cabinet.",
                },
                {
                  name: "Julien P.",
                  stars: 5,
                  text: "Packaging alone feels like a gift. The tea itself is even better.",
                },
                {
                  name: "Priya S.",
                  stars: 4,
                  text: "Lovely flavor, arrived quickly. Would order again.",
                },
              ].map((review) => (
                <div
                  key={review.name}
                  className="border-b border-charcoal/10 pb-6 last:border-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-sm text-charcoal">
                      {review.name}
                    </span>
                    <span className="text-sage text-xs">
                      {"★".repeat(review.stars)}
                      {"☆".repeat(5 - review.stars)}
                    </span>
                  </div>
                  <p className="font-body text-sm text-charcoal/70 leading-relaxed">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
  function AccordionRow({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    const [open, setOpen] = useState(false);

    return (
      <div className="border-b border-charcoal/10">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-5 text-left"
        >
          <span className="font-body text-sm text-charcoal">{title}</span>
          <span className="text-charcoal/40 text-lg leading-none">
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <p className="font-body text-sm text-charcoal/60 leading-relaxed pb-5">
            {children}
          </p>
        )}
      </div>
    );
  }
}
