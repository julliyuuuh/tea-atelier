"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import CollectionCard from "@/components/CollectionCard";
import { COLLECTIONS } from "@/lib/collections";
import { motion } from "framer-motion";
import BusinessPurchaseBanner from "@/components/BusinessPurchaseBanner";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomSelect } from "@/components/admin/AdminUI";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { isProductAvailable, stockStatus, type Product } from "@/lib/products";

const STOCK_TONE = {
  out: "text-charcoal/70",
  low: "text-amber-800",
  in: "text-sage",
};
import { categoryTree, type MainCategory } from "@/lib/categories";
import {
  Heart,
  Search,
  X,
  ChevronDown,
  SlidersHorizontal,
  Check,
  ShoppingBag,
} from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";

type SortOption =
  | "Newest"
  | "Price: Low to High"
  | "Price: High to Low"
  | "Name: A to Z"
  | "Name: Z to A"
  | "Most popular";

function matchesCategory(product: Product, category: MainCategory) {
  return category === "Tea Accessories"
    ? product.category === "Accessories" ||
        String(product.category) === category
    : product.category === category;
}
function matchesSubcategory(
  product: Product,
  category: MainCategory,
  subcategory: string,
) {
  if (product.subCategory) return product.subCategory === subcategory;
  const names =
    (categoryTree[category] as Record<string, readonly string[]>)[
      subcategory
    ] || [];
  const normalize = (name: string) =>
    name.trim().toLowerCase().replace(/\s+/g, " ");
  return names.some((name) => normalize(name) === normalize(product.name));
}
function inStock(product: Product) {
  return isProductAvailable(product);
}

export default function ShopPage() {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(
    null,
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
        if (!controller.signal.aborted) setProducts(data.products as Product[]);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  const parsePrice = (value: string) =>
    value.trim() === "" ? null : Number(value);
  const minimum = parsePrice(minPrice);
  const maximum = parsePrice(maxPrice);
  const invalidRange =
    (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) ||
    (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) ||
    (minimum !== null && maximum !== null && minimum > maximum);
  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .filter(
              (product) =>
                (!expandedCategory ||
                  matchesCategory(product, expandedCategory)) &&
                (!expandedCategory ||
                  !selectedSubCategory ||
                  matchesSubcategory(
                    product,
                    expandedCategory,
                    selectedSubCategory,
                  )),
            )
            .map((product) => product.type?.trim())
            .filter((type): type is string => !!type),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [products, expandedCategory, selectedSubCategory],
  );

  const filteredProducts = useMemo(() => {
    let list = expandedCategory
      ? products.filter((product) => matchesCategory(product, expandedCategory))
      : [...products];
    if (expandedCategory && selectedSubCategory) {
      list = list.filter((product) =>
        matchesSubcategory(product, expandedCategory, selectedSubCategory),
      );
    }
    if (stockOnly) list = list.filter(inStock);
    if (selectedType)
      list = list.filter((product) => product.type?.trim() === selectedType);
    if (!invalidRange) {
      if (minimum !== null)
        list = list.filter((product) => product.price >= minimum);
      if (maximum !== null)
        list = list.filter((product) => product.price <= maximum);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description || "").toLowerCase().includes(term),
      );
    }

    if (sortBy === "Price: Low to High") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Price: High to Low") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "Name: A to Z") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Name: Z to A") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "Most popular") {
      list.sort(
        (a, b) =>
          (b.unitsSold || 0) - (a.unitsSold || 0) ||
          Number(b.id) - Number(a.id),
      );
    } else {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return list;
  }, [
    products,
    expandedCategory,
    selectedSubCategory,
    sortBy,
    search,
    stockOnly,
    selectedType,
    minimum,
    maximum,
    invalidRange,
  ]);
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(categoryTree) as MainCategory[]).map((category) => [
          category,
          products.filter((product) => matchesCategory(product, category))
            .length,
        ]),
      ),
    [products],
  );
  const hasFilters =
    !!search ||
    !!expandedCategory ||
    stockOnly ||
    !!selectedType ||
    minPrice !== "" ||
    maxPrice !== "";
  function clearFilters() {
    setSearch("");
    setExpandedCategory(null);
    setSelectedSubCategory(null);
    setStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setSelectedType("");
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      {user ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-3xl text-charcoal mb-1">
              Welcome back, {user.name || "there"}
            </h1>
            <p className="font-body text-sm text-charcoal/70">
              Here&apos;s what&apos;s fresh in the atelier today.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
          <span className="font-body text-xs text-charcoal/70">
            Home <span className="mx-2">/</span>
            <span className="text-charcoal">Shop</span>
          </span>
        </div>
      )}

      {/* Collections Teaser, logged in only */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-10 border-b border-charcoal/10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <span className="font-body text-[11px] tracking-[0.2em] uppercase text-sage mb-1 block">
                Curated for you
              </span>
              <h2 className="font-display text-2xl text-charcoal">
                Explore Collections
              </h2>
            </div>
            <Link
              href="/collections"
              className="group inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.15em] text-charcoal/70 border-b border-charcoal/30 pb-1 hover:text-sage hover:border-sage transition-colors"
            >
              View all
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COLLECTIONS.map((collection) => (
              <CollectionCard
                key={collection.slug}
                href={`/collections/${collection.slug}`}
                name={collection.name}
                tagline={collection.tagline}
                image={collection.image}
                imagePosition={collection.imagePosition}
                className="h-60"
              />
            ))}
          </div>
        </div>
      )}

      {/* Shop All heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-6">
        {/* The page's main heading when there's no welcome-back greeting. */}
        {user ? (
          <h2 className="font-display text-3xl text-charcoal mb-2">Shop All</h2>
        ) : (
          <h1 className="font-display text-4xl text-charcoal mb-2">Shop All</h1>
        )}
        <p className="font-body text-sm text-charcoal/70">
          Find your next everyday ritual, from loose-leaf tea to matcha
          essentials.
        </p>
        <BusinessPurchaseBanner />
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-charcoal/10 bg-sand/15 p-3 sm:p-4">
          <div className="relative w-full min-w-0 sm:w-96 sm:shrink-0">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/70"
            />
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full appearance-none rounded-full border border-charcoal/20 bg-cream py-3 pl-11 pr-10 font-body text-sm text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-charcoal/70 hover:bg-sand/30 hover:text-charcoal"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 px-1 font-body text-xs text-charcoal/70">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(event) => setStockOnly(event.target.checked)}
              className="h-4 w-4 accent-sage"
            />
            In stock only
          </label>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={clearFilters}
            className="min-w-[70px] cursor-pointer font-body text-xs text-sage underline underline-offset-4 disabled:invisible"
          >
            Clear filters
          </button>
          <div className="ml-auto">
            <label htmlFor="shop-sort" className="sr-only">
              Sort products
            </label>
            <CustomSelect
              id="shop-sort"
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              options={[
                { value: "Newest", label: "Newest" },
                { value: "Most popular", label: "Most popular" },
                { value: "Name: A to Z", label: "Name: A to Z" },
                { value: "Name: Z to A", label: "Name: Z to A" },
                { value: "Price: Low to High", label: "Price: Low to High" },
                { value: "Price: High to Low", label: "Price: High to Low" },
              ]}
              triggerClassName="w-56 cursor-pointer rounded-full border border-charcoal/20 bg-cream px-4 py-3 font-body text-xs text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
            />
          </div>
        </div>
      </div>

      {/* Sidebar + Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-24 grid grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)] gap-5 lg:gap-8">
        {/* Sidebar */}
        <aside>
          <button
            type="button"
            className="mb-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-charcoal/10 bg-sand/15 px-4 py-3 font-body text-sm text-charcoal md:hidden"
            aria-expanded={showFilters}
            aria-controls="shop-categories"
            onClick={() => setShowFilters((value) => !value)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={15} />
              {expandedCategory || "Categories"}
            </span>
            <ChevronDown
              size={16}
              className={showFilters ? "rotate-180" : ""}
            />
          </button>
          <div
            id="shop-categories"
            className={`${showFilters ? "block" : "hidden"} md:block`}
          >
            <h2 className="font-body text-xs uppercase tracking-wide text-charcoal/70 mb-3">
              Categories
            </h2>
            <button
              type="button"
              aria-pressed={!expandedCategory}
              onClick={() => {
                setExpandedCategory(null);
                setSelectedSubCategory(null);
                setSelectedType("");
              }}
              className={`flex w-full cursor-pointer items-center justify-between text-left font-body text-sm py-2.5 rounded-xl px-3 transition-colors focus-visible:outline-2 focus-visible:outline-sage ${
                !expandedCategory
                  ? "bg-sage/15 text-charcoal font-medium"
                  : "text-charcoal/70 hover:bg-sand/40"
              }`}
            >
              All Products
              <span className="font-body text-[11px] text-charcoal/70">
                {isLoading ? "..." : products.length}
              </span>
            </button>

            {(Object.keys(categoryTree) as MainCategory[]).map((cat) => (
              <div key={cat}>
                <button
                  type="button"
                  aria-expanded={expandedCategory === cat}
                  aria-controls={`shop-subcategories-${cat.replace(/\s/g, "-")}`}
                  onClick={() => {
                    setExpandedCategory(expandedCategory === cat ? null : cat);
                    setSelectedSubCategory(null);
                    setSelectedType("");
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 w-full text-left font-body text-sm py-2.5 rounded-xl px-3 transition-colors focus-visible:outline-2 focus-visible:outline-sage ${
                    expandedCategory === cat
                      ? "bg-sage/15 text-charcoal font-medium"
                      : "text-charcoal/70 hover:bg-sand/40"
                  }`}
                >
                  {cat}
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-body text-[11px] text-charcoal/70">
                      {isLoading ? "..." : categoryCounts[cat]}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`text-charcoal/70 ${expandedCategory === cat ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {expandedCategory === cat && (
                  <div
                    id={`shop-subcategories-${cat.replace(/\s/g, "-")}`}
                    className="ml-3 border-l border-charcoal/10 pl-3 py-1 space-y-1"
                  >
                    {Object.keys(categoryTree[cat]).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        aria-pressed={selectedSubCategory === sub}
                        onClick={() => {
                          setSelectedSubCategory(
                            selectedSubCategory === sub ? null : sub,
                          );
                          setSelectedType("");
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left font-body text-xs py-2 px-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-sage ${
                          selectedSubCategory === sub
                            ? "text-sage font-medium"
                            : "text-charcoal/70 hover:text-charcoal"
                        }`}
                      >
                        {sub}
                        {selectedSubCategory === sub && (
                          <Check size={12} className="shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-5 space-y-4 border-t border-charcoal/10 pt-4">
              <div>
                <p className="mb-2 font-body text-xs uppercase tracking-wide text-charcoal/70">
                  Price range (PHP)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0 font-body text-xs text-charcoal/70">
                    Minimum
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      aria-invalid={invalidRange}
                      aria-describedby={
                        invalidRange ? "shop-price-error" : undefined
                      }
                      placeholder="Any"
                      className="mt-1 w-full rounded-lg border border-charcoal/20 bg-transparent px-2 py-2 text-sm text-charcoal outline-none focus:border-sage"
                    />
                  </label>
                  <label className="min-w-0 font-body text-xs text-charcoal/70">
                    Maximum
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      aria-invalid={invalidRange}
                      aria-describedby={
                        invalidRange ? "shop-price-error" : undefined
                      }
                      placeholder="Any"
                      className="mt-1 w-full rounded-lg border border-charcoal/20 bg-transparent px-2 py-2 text-sm text-charcoal outline-none focus:border-sage"
                    />
                  </label>
                </div>
                {invalidRange && (
                  <p
                    id="shop-price-error"
                    role="status"
                    className="mt-2 font-body text-xs text-red-700"
                  >
                    Use non-negative prices with minimum no greater than
                    maximum. Price filtering pauses until corrected.
                  </p>
                )}
              </div>
              {typeOptions.length > 0 && (
                <div>
                  <label
                    htmlFor="shop-type"
                    className="mb-2 block font-body text-xs uppercase tracking-wide text-charcoal/70"
                  >
                    Product type
                  </label>
                  <CustomSelect
                    id="shop-type"
                    value={selectedType}
                    onChange={setSelectedType}
                    options={[
                      { value: "", label: "All types" },
                      ...typeOptions.map((type) => ({
                        value: type,
                        label: type,
                      })),
                    ]}
                    triggerClassName="w-full cursor-pointer rounded-xl border border-charcoal/20 bg-transparent px-3 py-2.5 font-body text-xs text-charcoal outline-none focus:border-sage"
                  />
                </div>
              )}
            </div>

            <p className="font-body text-[11px] text-charcoal/70 mt-6 leading-relaxed">
              Browse a category or search for a tea you love.
            </p>
          </div>
        </aside>

        {/* Grid */}
        <div>
          <h2 className="sr-only">Products</h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-body text-xs text-charcoal/70">
            <p role="status">
              {isLoading
                ? "Loading products..."
                : errorMessage
                  ? "Products unavailable"
                  : `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`}
              {expandedCategory && (
                <span> · {selectedSubCategory || expandedCategory}</span>
              )}
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="font-body text-sm text-red-600 mb-8">
              {errorMessage}
            </p>
          )}

          {!isLoading && filteredProducts.length === 0 && !errorMessage && (
            <div className="rounded-2xl border border-dashed border-charcoal/15 bg-sand/10 px-5 py-12 text-center">
              <p className="font-body text-sm text-charcoal/70 mb-3">
                {search ? `No results for "${search}"` : "No products found."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-body text-xs uppercase tracking-wide text-sage hover:text-charcoal transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <div
              className="grid grid-cols-2 gap-3 lg:grid-cols-3 sm:gap-5"
              aria-label="Loading products"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-charcoal/10 bg-sand/15 p-3"
                >
                  <div className="aspect-square rounded-xl bg-sand/30 animate-pulse motion-reduce:animate-none" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-sand/30" />
                  <div className="mt-2 h-4 w-1/3 rounded bg-sand/30" />
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="flex min-w-0 flex-col rounded-2xl border border-charcoal/10 bg-sand/15 p-2.5 transition-colors hover:border-sage/40 sm:p-3"
              >
                <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-sand/30">
                  <Link
                    href={`/shop/${product.id}`}
                    className="group block h-full"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                    <span className="absolute left-2 top-2 max-w-[calc(100%-52px)] truncate rounded-full bg-cream/90 px-2 py-1 font-body text-[11px] uppercase tracking-wide text-charcoal sm:left-3 sm:top-3 sm:text-[11px]">
                      {product.category === "Accessories"
                        ? "Tea Accessories"
                        : product.category}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    aria-pressed={isWishlisted(product.id)}
                    aria-label={`${isWishlisted(product.id) ? "Remove" : "Add"} ${product.name} ${isWishlisted(product.id) ? "from" : "to"} wishlist`}
                    className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-cream/90 transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-sage sm:right-3 sm:top-3"
                  >
                    <Heart
                      size={15}
                      className={
                        isWishlisted(product.id)
                          ? "fill-red-500 text-red-500"
                          : "text-charcoal/70"
                      }
                    />
                  </button>
                </div>
                <Link
                  href={`/shop/${product.id}`}
                  className="mb-3 flex grow flex-col px-0.5 focus-visible:outline-2 focus-visible:outline-sage"
                >
                  <h3 className="mb-2 break-words font-body text-xs font-medium leading-relaxed text-charcoal sm:text-sm">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="font-display text-base text-charcoal">
                      <DisplayPrice pesos={Number(product.price)} />
                    </span>
                    <span
                      className={`font-body text-[11px] sm:text-xs ${STOCK_TONE[stockStatus(product).tone]}`}
                    >
                      {stockStatus(product).label}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={!inStock(product)}
                  className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-charcoal px-2 py-2.5 font-body text-[11px] text-cream transition-colors hover:bg-sage disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/40 sm:text-xs"
                >
                  <ShoppingBag size={13} aria-hidden="true" />
                  {inStock(product) ? "Add to cart" : "Out of stock"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
