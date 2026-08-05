"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/products";

const categories = ["All", "Leaf Tea", "Matcha", "Accessories"] as const;
type Category = (typeof categories)[number];
type SortOption = "Newest" | "Price: Low to High" | "Price: High to Low";

const collectionsTeaser = [
  {
    name: "Morning Ritual",
    image: "/images/category-leaf.jpg",
    href: "/collections",
  },
  {
    name: "Matcha Moments",
    image: "/images/category-matcha.jpg",
    href: "/collections",
  },
  {
    name: "The Atelier Essentials",
    image: "/images/category-accessories.jpg",
    href: "/collections",
  },
];

type RecentOrder = {
  id: number;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const res = await fetch("/api/products", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load products.");
        setProducts(data.products as Product[]);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  // Placeholder recent orders — replace with a real /api/orders?limit=3 call once available
  useEffect(() => {
    if (user) {
      setRecentOrders([]);
    }
  }, [user]);

  const filteredProducts = useMemo(() => {
    let list =
      activeCategory === "All"
        ? [...products]
        : products.filter((p) => p.category === activeCategory);

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
    }

    if (sortBy === "Price: Low to High") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Price: High to Low") {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, activeCategory, sortBy, search]);

  // Simple placeholder "recommended" — first 4 products until real personalization exists
  const recommended = products.slice(0, 4);

  return (
    <main className="min-h-screen">
      <Navbar />

      {user ? (
        <div className="max-w-7xl mx-auto px-8 pt-12 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-3xl text-charcoal mb-1">
              Welcome back, {user.name || "there"}
            </h1>
            <p className="font-body text-sm text-charcoal/60">
              Here's what's fresh in the atelier today.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <span className="font-body text-xs text-charcoal/50">
            Home <span className="mx-2">/</span>
            <span className="text-charcoal">Shop</span>
          </span>
        </div>
      )}

      {/* Recently Viewed / Recommended — logged in only */}
      {user && recommended.length > 0 && (
        <div className="max-w-7xl mx-auto px-8 py-8 border-b border-charcoal/10">
          <h2 className="font-body text-sm font-medium text-charcoal mb-4">
            Recommended For You
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommended.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${product.id}`}
                className="shrink-0 w-40 group"
              >
                <div className="relative w-40 h-48 rounded-2xl overflow-hidden bg-sand mb-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="font-body text-sm text-charcoal truncate">
                  {product.name}
                </p>
                <p className="font-body text-xs text-charcoal/60">
                  ₱{product.price}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My Recent Orders — logged in only */}
      {user && (
        <div className="max-w-7xl mx-auto px-8 py-8 border-b border-charcoal/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-sm font-medium text-charcoal">
              My Recent Orders
            </h2>
            <Link
              href="/orders"
              className="font-body text-xs uppercase tracking-wide text-sage hover:text-charcoal transition-colors"
            >
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="font-body text-xs text-charcoal/40">
              No orders yet — your first cup awaits.
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between bg-sand/30 rounded-xl px-5 py-3"
                >
                  <span className="font-body text-sm text-charcoal">
                    Order #TA-{order.id}
                  </span>
                  <span className="font-body text-xs text-charcoal/60 uppercase tracking-wide">
                    {order.status}
                  </span>
                  <span className="font-body text-sm text-charcoal">
                    ₱{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collections Teaser — logged in only */}
      {user && (
        <div className="max-w-7xl mx-auto px-8 py-8 border-b border-charcoal/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-sm font-medium text-charcoal">
              Explore Collections
            </h2>
            <Link
              href="/collections"
              className="font-body text-xs uppercase tracking-wide text-sage hover:text-charcoal transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {collectionsTeaser.map((col) => (
              <Link key={col.name} href={col.href} className="group block">
                <div className="relative h-40 rounded-2xl overflow-hidden bg-sand mb-2">
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="font-body text-sm text-charcoal">{col.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Shop All heading */}
      <div className="max-w-7xl mx-auto px-8 pt-10 pb-6">
        <h2 className="font-display text-3xl text-charcoal mb-2">Shop All</h2>
        <p className="font-body text-sm text-charcoal/60">
          {isLoading
            ? "Loading products..."
            : `${filteredProducts.length} products`}
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-8 pb-6">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-charcoal/20 px-5 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto px-8 pb-10 flex flex-wrap items-center justify-between gap-6 border-y border-charcoal/10 py-5">
        <div className="flex items-center gap-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-body text-xs tracking-[0.15em] uppercase pb-1 border-b transition-colors ${
                activeCategory === cat
                  ? "text-charcoal border-sage"
                  : "text-charcoal/50 border-transparent hover:text-charcoal"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="font-body text-xs tracking-wide uppercase bg-transparent rounded-full border border-charcoal/20 px-4 py-2 text-charcoal focus:outline-none"
        >
          <option>Newest</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        {errorMessage && (
          <p className="font-body text-sm text-red-600 mb-8">{errorMessage}</p>
        )}

        {!isLoading && filteredProducts.length === 0 && !errorMessage && (
          <div className="text-center py-12">
            <p className="font-body text-sm text-charcoal/60 mb-3">
              {search ? `No results for "${search}"` : "No products found."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="font-body text-xs uppercase tracking-wide text-sage hover:text-charcoal transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
          {filteredProducts.map((product) => (
            <Link
              href={`/shop/${product.id}`}
              key={product.id}
              className="group block"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-sand mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-4 left-4 bg-cream/90 rounded-full px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                  {product.category}
                </span>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cream text-charcoal rounded-full font-body text-[10px] tracking-wide uppercase px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Quick View
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl text-charcoal mb-1">
                    {product.name}
                  </h3>
                  <span className="font-body text-sm text-charcoal/70">
                    ₱{product.price}
                  </span>
                  <p className="font-body text-xs mt-1">
                    {product.stockQuantity === 0 ? (
                      <span className="text-charcoal/40">Out of Stock</span>
                    ) : product.stockQuantity <= 10 ? (
                      <span className="text-amber-600">Low Stock</span>
                    ) : (
                      <span className="text-sage">In Stock</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart(product);
                  }}
                  className="font-body text-xs tracking-wide uppercase border-b border-charcoal/40 pb-0.5 text-charcoal/80 hover:border-sage hover:text-sage transition-colors px-1"
                >
                  Add to Cart
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
