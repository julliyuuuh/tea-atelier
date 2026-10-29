"use client";

import DisplayPrice from "@/components/DisplayPrice";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { SkeletonBlock } from "@/components/Skeleton";
import { isOptimizableImage } from "@/lib/image-src";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable, type Product } from "@/lib/products";

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
        const res = await fetch("/api/products/best-sellers", {
          signal: controller.signal,
        });
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

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-24">
      <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
        Shop
      </span>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <h2 className="font-display text-4xl text-charcoal">Best Sellers</h2>
        <Link
          href="/shop"
          className="group inline-flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-charcoal/70 border-b border-charcoal/30 pb-1 hover:text-sage hover:border-sage transition-colors"
        >
          View all teas
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
        {isLoading &&
          offsets.map((offset, i) => (
            <div key={i} className={offset} aria-hidden="true">
              <SkeletonBlock className="aspect-[3/4] mb-4 rounded-none" />
              <SkeletonBlock className="h-5 w-2/3 mb-2" />
              <SkeletonBlock className="h-4 w-1/4" />
            </div>
          ))}

        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: (i % 3) * 0.08 }}
            className={`group ${offsets[i % offsets.length]}`}
          >
            <Link
              href={`/shop/${product.id}`}
              className="relative block aspect-[3/4] overflow-hidden bg-sand mb-4"
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                unoptimized={!isOptimizableImage(product.image)}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                {product.category}
              </span>
              {i < 3 && (
                <span className="absolute top-4 right-4 font-display text-sm italic text-white drop-shadow">
                  No. {i + 1}
                </span>
              )}
              <span className="absolute inset-x-4 bottom-4 translate-y-2 bg-cream/95 py-3 text-center font-body text-[11px] tracking-[0.15em] uppercase text-charcoal opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                View details
              </span>
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-charcoal mb-1">
                  <Link
                    href={`/shop/${product.id}`}
                    className="hover:text-sage transition-colors"
                  >
                    {product.name}
                  </Link>
                </h3>
                <span className="font-body text-sm text-charcoal/70">
                  <DisplayPrice pesos={Number(product.price)} />
                </span>
              </div>
              <button
                onClick={() => addToCart(product)}
                disabled={!isProductAvailable(product)}
                aria-label={
                  isProductAvailable(product)
                    ? `Add ${product.name} to cart`
                    : `${product.name} is out of stock`
                }
                className="shrink-0 font-body text-xs tracking-wide uppercase border-b border-charcoal/40 pb-0.5 text-charcoal/80 hover:border-sage hover:text-sage transition-colors px-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProductAvailable(product) ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
