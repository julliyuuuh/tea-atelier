"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import type { Product } from "@/lib/products";

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
        {isLoading &&
          [0, 1, 2, 3, 4, 5].map((i) => <ProductCardSkeleton key={i} />)}

        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            rank={i < 3 ? i + 1 : undefined}
          />
        ))}
      </div>
    </section>
  );
}
