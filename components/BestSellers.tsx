"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

const offsets = [
  "md:mt-0",
  "md:mt-12",
  "md:mt-0",
  "md:mt-12",
  "md:mt-0",
  "md:mt-12",
];

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const res = await fetch("/api/products", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load products.");
        setProducts(data.products);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  if (isLoading || products.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Shop
      </span>
      <h2 className="font-display text-4xl text-charcoal mb-12">
        Best Sellers
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`group ${offsets[i % offsets.length]}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-sand mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                {product.category}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-charcoal mb-1">
                  {product.name}
                </h3>
                <span className="font-body text-sm text-charcoal/70">
                  ₱{product.price}
                </span>
              </div>
              <button
                onClick={() => addToCart(product)}
                className="font-body text-xs tracking-wide uppercase border-b border-charcoal/40 pb-0.5 text-charcoal/80 hover:border-sage hover:text-sage transition-colors px-1"
              >
                Add to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}