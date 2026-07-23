"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

const categories = ["All", "Leaf Tea", "Matcha", "Accessories"] as const;
type Category = (typeof categories)[number];
type SortOption = "Newest" | "Price: Low to High" | "Price: High to Low";

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const { addToCart } = useCart();

  const filteredProducts = useMemo(() => {
    let list =
      activeCategory === "All"
        ? [...products]
        : products.filter((p) => p.category === activeCategory);

    if (sortBy === "Price: Low to High") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Price: High to Low") {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [activeCategory, sortBy]);

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-8 pt-8">
        <span className="font-body text-xs text-charcoal/50">
          Home <span className="mx-2">/</span>
          <span className="text-charcoal">Shop</span>
        </span>
      </div>

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-8 pt-6 pb-10">
        <h1 className="font-display text-4xl text-charcoal mb-2">Shop All</h1>
        <p className="font-body text-sm text-charcoal/60">
          {filteredProducts.length} products
        </p>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto px-8 pb-10 flex flex-wrap items-center justify-between gap-6 border-y border-charcoal/10 py-5">
        {/* Category Filter */}
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

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="font-body text-xs tracking-wide uppercase bg-transparent border border-charcoal/20 px-4 py-2 text-charcoal focus:outline-none"
        >
          <option>Newest</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
          {filteredProducts.map((product) => (
            <a
              href={`/shop/${product.id}`}
              key={product.id}
              className="group block"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-sand mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-4 left-4 bg-cream/90 px-3 py-1 font-body text-[10px] tracking-[0.15em] uppercase text-charcoal">
                  {product.category}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Quick View placeholder — we'll wire this up later
                  }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cream text-charcoal font-body text-[10px] tracking-wide uppercase px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    ${product.price}
                  </span>
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
            </a>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
