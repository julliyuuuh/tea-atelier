"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { Heart } from "lucide-react";

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-2">
          My Wishlist
        </h1>
        <p className="font-body text-sm text-charcoal/60 mb-12">
          {items.length} saved {items.length === 1 ? "item" : "items"}
        </p>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <Heart size={32} className="mx-auto text-charcoal/20 mb-4" />
            <p className="font-body text-charcoal/60 mb-6">
              Nothing saved yet.
            </p>
            <Link
              href="/shop"
              className="inline-block rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-3 border border-charcoal/10"
              >
                <Link href={`/shop/${product.id}`} className="block">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-sand mb-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-body text-sm font-medium text-charcoal mb-0.5 truncate">
                    {product.name}
                  </h3>
                  <p className="font-display text-base text-charcoal mb-3">
                    ₱{product.price}
                  </p>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart(product)}
                    className="flex-1 rounded-full bg-charcoal text-cream font-body text-xs tracking-wide uppercase py-2.5 hover:bg-sage transition-colors"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="w-9 h-9 rounded-full border border-charcoal/20 flex items-center justify-center hover:border-red-400 transition-colors shrink-0"
                    aria-label="Remove"
                  >
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
