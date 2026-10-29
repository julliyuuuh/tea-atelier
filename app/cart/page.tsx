"use client";
import { useBusiness } from "@/lib/business-context";
import { purchaseViolation, php } from "@/lib/purchase-limits";

import { motion } from "framer-motion";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import FreeShippingProgress from "@/components/FreeShippingProgress";
import { useAuth } from "@/lib/auth-context";
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
  const {
    approved,
    limits,
    ready: limitsReady,
    error: limitsError,
  } = useBusiness();
  const { user } = useAuth();
  const tier = approved ? limits.business : limits.standard;
  const limitError = purchaseViolation(
    selectedItems,
    Math.round(subtotal * 100),
    "",
    limits,
    approved,
  );
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
          <p role="status" className="font-body text-sm text-charcoal/70">
            Loading your cart...
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-charcoal/10 bg-sand/25 px-6 py-20 text-center">
            <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-sage">
              <ShoppingBag
                aria-hidden="true"
                strokeWidth={1.5}
                className="h-7 w-7"
              />
            </span>
            <h2 className="font-display text-2xl text-charcoal mb-2">
              Your cart is empty
            </h2>
            <p className="font-body text-sm text-charcoal/70 mb-8 max-w-sm">
              Find a tea for your next quiet moment. Our best sellers are a good
              place to start.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/shop"
                className="inline-block rounded-full bg-charcoal text-cream font-body text-xs tracking-[0.15em] uppercase px-8 py-4 hover:bg-sage transition-colors"
              >
                Shop all teas
              </Link>
              <Link
                href="/collections"
                className="inline-block rounded-full border border-charcoal/25 text-charcoal font-body text-xs tracking-[0.15em] uppercase px-8 py-4 hover:border-charcoal transition-colors"
              >
                Browse collections
              </Link>
            </div>
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
                <p role="status" className="font-body text-xs text-charcoal/70">
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
                      <h2 className="font-display text-xl text-charcoal mb-1">
                        {item.product.name}
                      </h2>
                      <span className="font-body text-sm text-charcoal/70">
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
                          disabled={
                            !limitsReady ||
                            item.quantity >=
                              Math.min(
                                tier.perProduct,
                                item.product.stockQuantity,
                              )
                          }
                          className="px-3 py-2 font-body text-charcoal hover:bg-sand transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label={`Remove ${item.product.name} from cart`}
                        className="-m-2 p-2 font-body text-xs uppercase tracking-wide text-charcoal/70 hover:text-sage transition-colors"
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
              <p className="font-body text-xs text-charcoal/70 mb-5">
                {selectedQuantity} item{selectedQuantity === 1 ? "" : "s"}{" "}
                selected. Unselected products stay in your cart.
              </p>
              <FreeShippingProgress
                subtotal={subtotal}
                className="mb-6 rounded-2xl bg-cream/70 p-4"
              />
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

              <p className="mb-3 text-xs text-charcoal/70">
                {selectedQuantity}/{tier.totalUnits} units selected · Up to{" "}
                {php(tier.totalCents)} including delivery
              </p>
              {(limitError || limitsError) && (
                <p role="alert" className="mb-3 text-sm text-red-700">
                  {limitError || limitsError}
                </p>
              )}
              {unavailableSelection && (
                <p
                  role="status"
                  className="mb-4 font-body text-sm text-charcoal/70"
                >
                  Some selected items are unavailable or exceed current stock.
                  Uncheck them or adjust their quantity to continue.
                </p>
              )}
              {selectedItems.length > 0 &&
              !unavailableSelection &&
              !limitError &&
              limitsReady ? (
                user ? (
                  <Link
                    href="/checkout"
                    className="block text-center rounded-full bg-charcoal text-cream font-body text-sm py-4 hover:bg-sage transition-colors"
                  >
                    Checkout ({selectedQuantity})
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login?redirect=%2Fcheckout"
                      className="block text-center rounded-full bg-charcoal text-cream font-body text-sm py-4 hover:bg-sage transition-colors"
                    >
                      Sign in to check out
                    </Link>
                    <p className="mt-3 text-center font-body text-xs text-charcoal/70">
                      New here?{" "}
                      <Link
                        href="/signup?redirect=%2Fcheckout"
                        className="text-sage underline underline-offset-2 hover:text-charcoal"
                      >
                        Create an account
                      </Link>{" "}
                      in a minute. Your cart comes with you.
                    </p>
                  </>
                )
              ) : (
                <button
                  type="button"
                  disabled
                  className="block w-full cursor-not-allowed rounded-full bg-charcoal/10 py-4 text-center font-body text-sm text-charcoal/70"
                >
                  {!limitsReady
                    ? "Loading purchase limits…"
                    : limitError || unavailableSelection
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
