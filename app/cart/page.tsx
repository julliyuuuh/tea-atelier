"use client";

import { motion } from "framer-motion";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { isProductAvailable } from "@/lib/products";

export default function CartPage() {
  const {
    items,
    selectedItems,
    selectedSubtotal: subtotal,
    setItemSelected,
    setAllSelected,
    removeFromCart,
    updateQuantity,
    loading,
  } = useCart();
  const unavailableSelection = selectedItems.some(
    (item) =>
      !isProductAvailable(item.product) ||
      item.quantity > item.product.stockQuantity,
  );
  const selectedIds = new Set(selectedItems.map((item) => item.product.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-12">Your Cart</h1>

        {loading ? (
          <p role="status" className="font-body text-sm text-charcoal/60">
            Loading your cart...
          </p>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-body text-charcoal/60 mb-6">
              Your cart is empty.
            </p>

            <Link
              href="/shop"
              className="inline-block rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                <label className="flex cursor-pointer items-center gap-3 font-body text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input)
                        input.indeterminate =
                          selectedItems.length > 0 && !allSelected;
                    }}
                    onChange={(event) => setAllSelected(event.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-sage"
                  />
                  Select all
                </label>
                <p role="status" className="font-body text-xs text-charcoal/60">
                  {selectedItems.length} of {items.length} products selected
                </p>
              </div>
              {items.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 sm:gap-6 border-b border-charcoal/10 pb-8"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.product.name} for checkout`}
                    checked={selectedIds.has(item.product.id)}
                    onChange={(event) =>
                      setItemSelected(item.product.id, event.target.checked)
                    }
                    className="mt-2 h-4 w-4 shrink-0 cursor-pointer accent-sage"
                  />
                  <div className="w-20 h-24 sm:w-28 sm:h-32 rounded-2xl bg-sand overflow-hidden shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl text-charcoal mb-1">
                        {item.product.name}
                      </h3>
                      <span className="font-body text-sm text-charcoal/60">
                        <DisplayPrice pesos={Number(item.product.price)} />
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-charcoal/20 overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="px-3 py-2 font-body text-charcoal hover:bg-sand transition-colors"
                        >
                          −
                        </button>
                        <span className="px-4 font-body text-sm text-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="px-3 py-2 font-body text-charcoal hover:bg-sand transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="font-body text-xs uppercase tracking-wide text-charcoal/50 hover:text-sage transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-sand/40 rounded-2xl p-8 h-fit">
              <h2 className="font-display text-xl text-charcoal mb-6">
                Order Summary
              </h2>
              <p className="font-body text-xs text-charcoal/60 mb-5">
                {selectedQuantity} item{selectedQuantity === 1 ? "" : "s"}{" "}
                selected. Unselected products stay in your cart.
              </p>
              <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
                <span>Subtotal</span>
                <span>
                  <DisplayPrice pesos={subtotal} />
                </span>
              </div>
              <div className="flex justify-between font-body text-sm text-charcoal/70 mb-6">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-display text-lg text-charcoal border-t border-charcoal/10 pt-4 mb-8">
                <span>Total</span>
                <span>
                  <DisplayPrice pesos={subtotal} />
                </span>
              </div>

              {unavailableSelection && (
                <p
                  role="status"
                  className="mb-4 font-body text-sm text-charcoal/70"
                >
                  Some selected items are unavailable or exceed current stock.
                  Uncheck them or adjust their quantity to continue.
                </p>
              )}
              {selectedItems.length > 0 && !unavailableSelection ? (
                <Link
                  href="/checkout"
                  className="block text-center rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
                >
                  Checkout ({selectedQuantity})
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="block w-full cursor-not-allowed rounded-full bg-charcoal/10 py-4 text-center font-body text-sm text-charcoal/50"
                >
                  {unavailableSelection
                    ? "Update your selection"
                    : "Select items to checkout"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
