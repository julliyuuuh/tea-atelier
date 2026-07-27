"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";

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

            <Link
              href="/shop"
              className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="md:col-span-2 space-y-8">
              {items.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <h2 className="font-body text-lg">{item.product.name}</h2>
                      <p className="text-sm text-charcoal/60">
                        ${item.product.price} x {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Minus Button */}
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 bg-sage text-cream rounded hover:bg-charcoal transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    {/* Quantity Display */}
                    <span className="font-body text-lg">{item.quantity}</span>
                    {/* Plus Button */}
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2 py-1 bg-sage text-cream rounded hover:bg-charcoal transition-colors"
                    >
                      +
                    </button>
                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-sand/40 p-8 h-fit rounded">
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

              <Link
                href="/checkout"
                className="block text-center bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 rounded hover:bg-charcoal transition-colors"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}