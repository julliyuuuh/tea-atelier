"use client";

import { Truck } from "lucide-react";
import DisplayPrice from "@/components/DisplayPrice";
import { useStoreSettings } from "@/lib/store-settings-context";

// Mirrors shippingFeeCents: any delivery method is free once the product
// subtotal reaches the store's threshold. Hidden when no threshold is set.
export default function FreeShippingProgress({
  subtotal,
  className = "",
}: {
  subtotal: number;
  className?: string;
}) {
  const { settings, ready } = useStoreSettings();
  const thresholdCents = settings.freeShippingThresholdCents;
  if (!ready || thresholdCents === null || thresholdCents <= 0) return null;

  const subtotalCents = Math.round(subtotal * 100);
  const remaining = Math.max(0, thresholdCents - subtotalCents) / 100;
  const progress = Math.min(1, subtotalCents / thresholdCents);
  const unlocked = remaining === 0;

  return (
    <div className={className}>
      <p
        role="status"
        className="flex items-center gap-2 font-body text-sm text-charcoal"
      >
        <Truck
          aria-hidden="true"
          strokeWidth={1.5}
          className={`h-4 w-4 shrink-0 ${unlocked ? "text-sage" : "text-charcoal/70"}`}
        />
        {unlocked ? (
          <span>You&apos;ve unlocked free shipping.</span>
        ) : (
          <span>
            Add <DisplayPrice pesos={remaining} /> more for free shipping.
          </span>
        )}
      </p>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-charcoal/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-sage transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
