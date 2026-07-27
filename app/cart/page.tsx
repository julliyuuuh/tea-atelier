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
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 bg-sage text-cream rounded hover:bg-charcoal transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="font-body text-lg">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2 py-1 bg-sage text-cream rounded hover:bg-charcoal transition-colors"
                    >
                      +
                    </button>
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

            {/* Cart Summary */}
            <div className="bg-sage p-8 text-cream rounded">
              <h2 className="font-display text-2xl mb-4">Summary</h2>
              <div className="flex justify-between font-body text-lg mb-4">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                className="block bg-charcoal text-cream text-center py-2 rounded hover:bg-black transition-colors"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}