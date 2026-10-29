"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import DisplayPrice from "@/components/DisplayPrice";
import { SkeletonBlock } from "@/components/Skeleton";
import { useCart } from "@/lib/cart-context";
import { isOptimizableImage } from "@/lib/image-src";
import { isProductAvailable, type Product } from "@/lib/products";

// Storefront product tile shared by the landing page and collection pages.
export default function ProductCard({
  product,
  index = 0,
  rank,
}: {
  product: Product;
  index?: number;
  rank?: number;
}) {
  const { addToCart } = useCart();
  const available = isProductAvailable(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: (index % 3) * 0.08 }}
      className="group flex flex-col"
    >
      <Link
        href={`/shop/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand mb-5"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={!isOptimizableImage(product.image)}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute top-4 left-4 rounded-full bg-cream/90 px-3 py-1 font-body text-[11px] tracking-[0.15em] uppercase text-charcoal">
          {product.category}
        </span>
        {rank && (
          <span className="absolute top-4 right-4 font-display text-sm italic text-white drop-shadow">
            No. {rank}
          </span>
        )}
        <span className="absolute inset-x-4 bottom-4 translate-y-2 rounded-full bg-cream/95 py-3 text-center font-body text-[11px] tracking-[0.15em] uppercase text-charcoal opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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
          disabled={!available}
          aria-label={
            available
              ? `Add ${product.name} to cart`
              : `${product.name} is out of stock`
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-charcoal px-4 py-2.5 font-body text-xs text-cream hover:bg-sage transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/70"
        >
          <ShoppingBag size={13} aria-hidden="true" />
          {available ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <SkeletonBlock className="aspect-[4/5] mb-4 rounded-2xl" />
      <SkeletonBlock className="h-5 w-2/3 mb-2" />
      <SkeletonBlock className="h-4 w-1/4" />
    </div>
  );
}
