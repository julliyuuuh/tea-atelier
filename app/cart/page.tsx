"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal } = useCart();

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-12">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-body text-charcoal/60 mb-6">
              Your cart is empty.
            </p>

            <a
              href="/shop"
              className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Continue Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Items */}
            <div className="md:col-span-2 space-y-8">
              {items.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-6 border-b border-charcoal/10 pb-8"
                >
                  <div className="w-28 h-32 bg-sand overflow-hidden shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display text-xl text-charcoal mb-1">
                        {item.product.name}
                      </h3>
                      <span className="font-body text-sm text-charcoal/60">
                        ${item.product.price}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-charcoal/20">
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

            {/* Summary */}
            <div className="bg-sand/40 p-8 h-fit">
              <h2 className="font-display text-xl text-charcoal mb-6">
                Order Summary
              </h2>
              <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-body text-sm text-charcoal/70 mb-6">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-display text-lg text-charcoal border-t border-charcoal/10 pt-4 mb-8">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <a
                href="/checkout"
                className="block text-center bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
              >
                Checkout
              </a>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
