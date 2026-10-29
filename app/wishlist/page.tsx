"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable } from "@/lib/products";
import { Heart } from "lucide-react";

//main page
export default function WishlistPage() {
  const { items, removeFromWishlist, loading, error, refreshWishlist } =
    useWishlist();
  const { user } = useAuth();
  const { addToCart } = useCart();

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-2">
          My Wishlist
        </h1>
        <p className="font-body text-sm text-charcoal/70 mb-12">
          {loading
            ? "Loading saved items..."
            : `${items.length} saved ${items.length === 1 ? "item" : "items"}`}
        </p>

        {!user && !loading && (
          <p className="mb-6 font-body text-sm text-charcoal/70">
            <Link
              href="/login?redirect=%2Fwishlist"
              className="text-sage underline"
            >
              Sign in
            </Link>{" "}
            to keep your wishlist across visits. Guest items are temporary.
          </p>
        )}
        {loading ? (
          <p role="status" className="font-body text-sm text-charcoal/70">
            Loading your wishlist...
          </p>
        ) : error && items.length === 0 ? (
          <p className="font-body text-sm text-charcoal/70">
            Your saved items could not be loaded.{" "}
            <button
              type="button"
              onClick={() => void refreshWishlist()}
              className="cursor-pointer text-sage underline"
            >
              Try again
            </button>
          </p>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Heart size={32} className="mx-auto text-charcoal/20 mb-4" />
            <p className="font-body text-charcoal/70 mb-6">
              Nothing saved yet.
            </p>
            <Link
              href="/shop"
              className="inline-block rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-sage transition-colors"
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
                  <h2 className="font-body text-sm font-medium text-charcoal mb-0.5 truncate">
                    {product.name}
                  </h2>
                  <p className="font-display text-base text-charcoal mb-3">
                    <DisplayPrice pesos={Number(product.price)} />
                  </p>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart(product)}
                    disabled={!isProductAvailable(product)}
                    className="flex-1 rounded-full bg-charcoal text-cream font-body text-xs py-2.5 hover:bg-sage transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/40"
                  >
                    {isProductAvailable(product)
                      ? "Add to cart"
                      : "Out of stock"}
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
