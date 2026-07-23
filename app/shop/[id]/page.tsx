"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">Product not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-8 pt-8">
        <span className="font-body text-xs text-charcoal/50">
          <a href="/shop" className="hover:text-charcoal transition-colors">
            Shop
          </a>
          <span className="mx-2">/</span>
          <span className="text-charcoal">{product.name}</span>
        </span>
      </div>

      {/* Product Layout */}
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative aspect-[3/4] overflow-hidden bg-sand"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4">
            {product.category}
          </span>
          <h1 className="font-display text-4xl text-charcoal mb-4">
            {product.name}
          </h1>
          <span className="font-body text-2xl text-charcoal/80 mb-6">
            ${product.price}
          </span>
          <p className="font-body text-sm text-charcoal/70 leading-relaxed mb-8">
            {product.description}
          </p>

          <span className="font-body text-xs uppercase tracking-wide text-sage mb-8">
            {product.availability}
          </span>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-6">
            <div className="flex items-center border border-charcoal/20">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                −
              </button>
              <span className="px-4 font-body text-sm text-charcoal">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => addToCart(product, quantity)}
              className="flex-1 bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
