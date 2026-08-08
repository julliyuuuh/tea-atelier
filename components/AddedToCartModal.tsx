"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useEffect } from "react";

export default function AddedToCartModal() {
  const { lastAdded, clearLastAdded } = useCart();

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => clearLastAdded(), 4000);
    return () => clearTimeout(timer);
  }, [lastAdded, clearLastAdded]);

  if (!lastAdded) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm">
      <div className="bg-cream border border-charcoal/10 rounded-lg shadow-lg p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-sand rounded-lg overflow-hidden shrink-0">
          <img
            src={lastAdded.image}
            alt={lastAdded.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-charcoal font-medium truncate">
            {lastAdded.name}
          </p>
          <p className="font-body text-xs text-sage">Added to cart</p>
        </div>
        <button
          onClick={clearLastAdded}
          className="text-charcoal/40 hover:text-charcoal text-sm shrink-0"
        >
          ✕
        </button>
      </div>
      <Link
        href="/cart"
        onClick={clearLastAdded}
        className="block text-center bg-sage text-cream font-body text-xs tracking-wide uppercase py-2.5 mt-2 rounded-lg hover:bg-charcoal transition-colors"
      >
        View Cart
      </Link>
    </div>
  );
}