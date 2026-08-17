"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/products";
import { categoryTree, type MainCategory } from "@/lib/categories";

type SortOption = "Newest" | "Price: Low to High" | "Price: High to Low";

const collectionsTeaser = [
  {
    name: "Morning Ritual",
    image: "/images/morning-ritual.png",
    href: "/collections",
  },
  {
    name: "Matcha Moments",
    image: "/images/matcha-moments.png",
    href: "/collections",
  },
  {
    name: "The Atelier Essentials",
    image: "/images/tea-acc.png",
    href: "/collections",
  },
];

export default function ShopPage() {
  const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(
    null,
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { addToCart } = useCart();
  const { user } = useAuth();

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

  const filteredProducts = useMemo(() => {
    let list = !expandedCategory
      ? [...products]
      : products.filter(
          (p) =>
            p.category === expandedCategory ||
            (expandedCategory === "Tea Accessories" &&
              p.category === "Accessories"),
        );

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
  }, [products, expandedCategory, sortBy, search]);

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

      {/* Sidebar + Grid Layout */}
      <div className="max-w-7xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10">
        {/* Sidebar */}
        <aside>
          <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/50 mb-4">
            Categories
          </h3>
          <button
            onClick={() => {
              setExpandedCategory(null);
              setSelectedSubCategory(null);
            }}
            className={`block w-full text-left font-body text-sm py-2 rounded-lg px-3 transition-colors ${
              !expandedCategory
                ? "bg-sage/15 text-charcoal font-medium"
                : "text-charcoal/70 hover:bg-sand/40"
            }`}
          >
            All Products
          </button>

          {(Object.keys(categoryTree) as MainCategory[]).map((cat) => (
            <div key={cat}>
              <button
                onClick={() => {
                  setExpandedCategory(expandedCategory === cat ? null : cat);
                  setSelectedSubCategory(null);
                }}
                className={`flex items-center justify-between w-full text-left font-body text-sm py-2 rounded-lg px-3 transition-colors ${
                  expandedCategory === cat
                    ? "bg-sage/15 text-charcoal font-medium"
                    : "text-charcoal/70 hover:bg-sand/40"
                }`}
              >
                {cat}
                <span className="text-xs text-charcoal/40">
                  {expandedCategory === cat ? "−" : "+"}
                </span>
              </button>

              {expandedCategory === cat && (
                <div className="ml-3 border-l border-charcoal/10 pl-3 py-1 space-y-1">
                  {Object.keys(categoryTree[cat]).map((sub) => (
                    <button
                      key={sub}
                      onClick={() =>
                        setSelectedSubCategory(
                          selectedSubCategory === sub ? null : sub,
                        )
                      }
                      className={`block w-full text-left font-body text-xs py-1.5 px-2 rounded transition-colors ${
                        selectedSubCategory === sub
                          ? "text-sage font-medium"
                          : "text-charcoal/60 hover:text-charcoal"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <p className="font-body text-[10px] text-charcoal/40 mt-6 leading-relaxed">
            Subcategory filtering activates once product data supports it.
          </p>
        </aside>

        {/* Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="font-body text-xs text-charcoal/50">
              {filteredProducts.length} products
            </span>
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

          {errorMessage && (
            <p className="font-body text-sm text-red-600 mb-8">
              {errorMessage}
            </p>
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

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-3 border border-charcoal/10 hover:shadow-lg transition-shadow"
              >
                <Link href={`/shop/${product.id}`} className="group block">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-sand mb-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 bg-cream/90 rounded-full px-2.5 py-1 font-body text-[9px] tracking-[0.1em] uppercase text-charcoal">
                      {product.category}
                    </span>
                  </div>

                  <div className="px-1">
                    <h3 className="font-body text-sm font-medium text-charcoal mb-0.5 truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display text-base text-charcoal">
                        ₱{product.price}
                      </span>
                      <span className="font-body text-[10px]">
                        {product.stockQuantity === 0 ? (
                          <span className="text-charcoal/40">Out of Stock</span>
                        ) : product.stockQuantity <= 10 ? (
                          <span className="text-amber-600">Low Stock</span>
                        ) : (
                          <span className="text-sage">In Stock</span>
                        )}
                      </span>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stockQuantity === 0}
                  className="w-full rounded-full bg-charcoal text-cream font-body text-xs tracking-wide uppercase py-2.5 hover:bg-sage transition-colors disabled:bg-charcoal/20 disabled:cursor-not-allowed"
                >
                  {product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
