"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import FreeShippingProgress from "@/components/FreeShippingProgress";
import { useCart } from "@/lib/cart-context";

export default function AddedToCartModal() {
  const { lastAdded, clearLastAdded, subtotal, totalItems } = useCart();
  const [paused, setPaused] = useState(false);

  // Auto-dismiss, but not while the shopper is hovering or focused inside it.
  useEffect(() => {
    if (!lastAdded || paused) return;
    const timer = setTimeout(() => clearLastAdded(), 5000);
    return () => clearTimeout(timer);
  }, [lastAdded, paused, clearLastAdded]);

  return (
    <AnimatePresence>
      {lastAdded && (
        <motion.div
          key={lastAdded.id}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="fixed inset-x-4 bottom-4 z-[100] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
        >
          <div className="rounded-2xl border border-charcoal/10 bg-cream p-5 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element -- product images can come from any CMS host */}
                <img
                  src={lastAdded.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 500 }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sage text-white ring-2 ring-cream"
                >
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                </motion.span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-body text-xs text-sage">
                  Added to your cart
                </p>
                <p className="truncate font-display text-lg text-charcoal">
                  {lastAdded.name}
                </p>
                <p className="font-body text-xs text-charcoal/70">
                  {totalItems} {totalItems === 1 ? "item" : "items"} in cart
                </p>
              </div>
              <button
                type="button"
                onClick={clearLastAdded}
                aria-label="Close"
                className="-m-1 shrink-0 rounded-full p-1.5 text-charcoal/70 hover:bg-sand/50 hover:text-charcoal"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <FreeShippingProgress subtotal={subtotal} className="mt-4" />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearLastAdded}
                className="rounded-full border border-charcoal/20 py-3 font-body text-sm text-charcoal hover:border-charcoal transition-colors"
              >
                Keep shopping
              </button>
              <Link
                href="/cart"
                onClick={clearLastAdded}
                className="rounded-full bg-charcoal py-3 text-center font-body text-sm text-cream hover:bg-sage transition-colors"
              >
                View cart
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
