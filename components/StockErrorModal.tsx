"use client";

import { useCart } from "@/lib/cart-context";

export default function StockErrorModal() {
  const { stockError, clearStockError } = useCart();

  if (!stockError) return null;

  return (
    <div className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-[100] p-6">
      <div className="bg-cream border border-charcoal/10 rounded-lg p-8 max-w-sm w-full text-center">
        <p className="font-body text-sm text-charcoal mb-6">{stockError}</p>
        <button
          onClick={clearStockError}
          className="bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-3 rounded-lg hover:bg-charcoal transition-colors"
        >
          Okay
        </button>
      </div>
    </div>
  );
}