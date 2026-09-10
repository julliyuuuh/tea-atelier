"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Package, Loader2 } from "lucide-react";
import type { Product } from "@/lib/products";
import { categoryTree, type MainCategory } from "@/lib/categories";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import { SkeletonBlock } from "@/components/Skeleton";
import {
  ErrorBanner,
  StatChip,
  SortHeader,
  PlainHeader,
  CustomSelect,
  rowVariants,
  type SortConfig,
} from "@/components/admin/AdminUI";
import ProductFormModal from "@/components/admin/ProductFormModal";

const PAGE_SIZE = 10;

type SortKey = "name" | "price" | "stockQuantity";

type Stats = {
  active: number;
  lowStock: number;
  outOfStock: number;
  archived: number;
};

// What we're confirming in the shared ConfirmDialog: one product, or a bulk
// selection. Both resolve down to the same single-id DELETE endpoint below —
// bulk delete is N sequential calls to the existing endpoint, not a new one.
type ConfirmTarget =
  | { type: "single"; id: string }
  | { type: "bulk"; ids: string[] }
  | null;

// Shared column layout so the header, skeleton rows, and data rows always line up.
// First column is the row-select checkbox.
const GRID_COLS =
  "40px minmax(220px,2.2fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(120px,1.1fr) minmax(140px,1fr)";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "All") return;
    qs.set(key, String(value));
  });
  return qs.toString();
}

export default function AdminProductsPage() {
  // Current page's rows only — the full catalog never lives in the browser.
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    archived: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<MainCategory | "All">(
    "All",
  );
  const [filterSubCategory, setFilterSubCategory] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showArchived, setShowArchived] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Debounce search so we're not hitting the DB on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Any change to what we're querying should land back on page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCategory, filterSubCategory, sortConfig]);

  const loadProducts = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const token = localStorage.getItem("token");
        const qs = buildQuery({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          category: filterCategory,
          subCategory: filterSubCategory,
          sortBy: sortConfig?.key,
          sortDir: sortConfig?.direction,
        });
        const res = await fetch(`/api/admin/products?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load products.");

        setProducts(data.products);
        setStats(data.stats);
        setTotalPages(data.totalPages);

        // If a delete emptied out the last page, step back one page rather
        // than showing a blank table.
        if (data.products.length === 0 && page > 1 && data.total > 0) {
          setCurrentPage(page - 1);
          return;
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, filterCategory, filterSubCategory, sortConfig],
  );

  useEffect(() => {
    loadProducts(currentPage);
    // Selection is scoped to whatever's currently on screen — clear it
    // whenever the page or query changes under it.
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loadProducts]);

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const token = localStorage.getItem("token");
      const qs = buildQuery({ archived: true, limit: 100, page: 1 });
      const res = await fetch(`/api/admin/products?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load archived products.");
      setArchivedProducts(data.products);
      setArchivedLoaded(true);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  const handleToggleArchived = () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next && !archivedLoaded) loadArchived();
  };

  const hasActiveFilters =
    search !== "" || filterCategory !== "All" || filterSubCategory !== "All";

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("All");
    setFilterSubCategory("All");
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const allVisibleSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      return new Set(products.map((p) => p.id));
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Shared by both the single-row delete button and the bulk action bar.
  // Bulk delete is implemented as N calls to the existing single-id DELETE
  // endpoint (archives each in turn) — the endpoint contract is unchanged.
  // Since the full catalog is no longer held client-side, a successful
  // delete just re-fetches the current page instead of patching local state.
  const performDelete = async (ids: string[]) => {
    setActionError("");
    const token = localStorage.getItem("token");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => {
          if (!res.ok) throw new Error();
          return id;
        }),
      ),
    );

    const succeededCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - succeededCount;

    if (failedCount > 0) {
      setActionError(
        ids.length === 1
          ? "Unable to remove product."
          : `Removed ${succeededCount} of ${ids.length} products — ${failedCount} failed.`,
      );
    }
    if (succeededCount > 0) {
      setSelectedIds(new Set());
      setArchivedLoaded(false); // stale now — reload next time it's opened
      await loadProducts(currentPage);
    }
  };

  const handleConfirmedDelete = async () => {
    if (!confirmTarget) return;
    const ids =
      confirmTarget.type === "single" ? [confirmTarget.id] : confirmTarget.ids;
    setConfirmTarget(null);
    if (confirmTarget.type === "bulk") setIsBulkDeleting(true);
    try {
      await performDelete(ids);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleRestore = async (id: string) => {
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to restore product.");
      setArchivedProducts((prev) => prev.filter((p) => p.id !== id));
      await loadProducts(currentPage); // stock/stats/active list just changed
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  // ProductFormModal does its own fetch/validation; on success we just
  // reload the current page rather than trying to patch it in place, since
  // an edit (e.g. to price or stock) can change where the row sorts/filters to.
  const handleProductSaved = async () => {
    await loadProducts(currentPage);
  };

  const confirmDialogProps = (() => {
    if (!confirmTarget) {
      // title is required by ConfirmDialogProps even while closed.
      return { open: false as const, title: "" };
    }
    if (confirmTarget.type === "single") {
      return {
        open: true as const,
        title: "Remove this product?",
        confirmLabel: "Remove",
      };
    }
    return {
      open: true as const,
      title: `Remove ${confirmTarget.ids.length} selected products?`,
      confirmLabel: `Remove ${confirmTarget.ids.length}`,
    };
  })();

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
            Products
          </h1>
          <p className="font-body text-sm text-charcoal/60">
            {isLoading ? (
              "Loading..."
            ) : (
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${currentPage}-${products.length}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  Page {currentPage} of {totalPages}
                </motion.span>
              </AnimatePresence>
            )}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-charcoal text-cream font-body text-sm px-5 py-2.5 hover:bg-sage transition-colors rounded-full shadow-sm"
        >
          <span className="text-base leading-none">+</span>
          Add Product
        </button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={() => loadProducts(currentPage)} />
      <ErrorBanner message={actionError} />

      {/* Stat chips — always reflect the whole catalog, not just this page */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatChip label="Active Products" value={stats.active} />
        <StatChip label="Low Stock" value={stats.lowStock} tone="warning" />
        <StatChip label="Out of Stock" value={stats.outOfStock} tone="danger" />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white border border-charcoal/10 rounded-xl px-4 py-3">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-sm border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        <CustomSelect
          id="filter-category"
          value={filterCategory}
          onChange={(value) => {
            setFilterCategory(value as MainCategory | "All");
            setFilterSubCategory("All");
          }}
          options={[
            { value: "All", label: "All Categories" },
            ...(Object.keys(categoryTree) as MainCategory[]).map((cat) => ({
              value: cat,
              label: cat,
            })),
          ]}
          triggerClassName="min-w-[170px] bg-white border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        {filterCategory !== "All" && categoryTree[filterCategory] && (
          <CustomSelect
            id="filter-subcategory"
            value={filterSubCategory}
            onChange={(value) => setFilterSubCategory(value)}
            options={[
              { value: "All", label: "All Subcategories" },
              ...Object.keys(categoryTree[filterCategory]).map((sub) => ({
                value: sub,
                label: sub,
              })),
            ]}
            triggerClassName="min-w-[170px] bg-white border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
          />
        )}

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              type="button"
              onClick={clearFilters}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="font-body text-sm text-charcoal/60 hover:text-charcoal underline px-1"
            >
              Clear filters
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between bg-charcoal text-cream rounded-xl px-4 py-2.5">
              <span className="font-body text-sm">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="font-body text-xs text-cream/70 hover:text-cream"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() =>
                    setConfirmTarget({
                      type: "bulk",
                      ids: Array.from(selectedIds),
                    })
                  }
                  className="flex items-center gap-1.5 font-body text-xs bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-full transition-colors"
                >
                  {isBulkDeleting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Delete selected
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="bg-white border border-charcoal/10 rounded-xl overflow-hidden"
        role="table"
        aria-label="Products"
      >
        <div role="rowgroup">
          <div
            role="row"
            className="grid items-center border-b border-charcoal/10"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div role="columnheader" className="px-5 py-3 flex items-center">
              <input
                type="checkbox"
                aria-label="Select all visible products"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                disabled={products.length === 0}
                className="w-3.5 h-3.5 rounded border-charcoal/30 accent-charcoal cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <SortHeader
              label="Product"
              sortKeyName="name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <PlainHeader label="Category" />
            <SortHeader
              label="Price"
              sortKeyName="price"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Stock"
              sortKeyName="stockQuantity"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <PlainHeader label="Availability" />
            <PlainHeader label="Actions" align="right" />
          </div>
        </div>

        <div role="rowgroup">
          {isLoading &&
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                role="row"
                className="grid items-center py-3 border-b border-charcoal/5 last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className="px-5">
                  <SkeletonBlock className="w-3.5 h-3.5 rounded" />
                </div>
                <div className="px-5 flex items-center gap-3">
                  <SkeletonBlock className="w-10 h-10 shrink-0" />
                  <SkeletonBlock className="h-4 w-32" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <div className="px-5 flex justify-end">
                  <SkeletonBlock className="h-4 w-12" />
                </div>
                <div className="px-5 flex justify-end">
                  <SkeletonBlock className="h-4 w-10" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
                <div className="px-5 flex justify-end gap-3">
                  <SkeletonBlock className="h-4 w-10" />
                  <SkeletonBlock className="h-4 w-12" />
                </div>
              </div>
            ))}

          {!isLoading && (
            <AnimatePresence initial={false}>
              {products.map((product, index) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <motion.div
                    key={product.id}
                    role="row"
                    custom={index}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={`grid items-center py-3 border-b border-charcoal/5 last:border-0 hover:bg-sand/20 hover:shadow-sm transition-colors overflow-hidden group ${
                      isSelected ? "bg-sage/5" : ""
                    }`}
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div role="cell" className="px-5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectRow(product.id)}
                        className="w-3.5 h-3.5 rounded border-charcoal/30 accent-charcoal cursor-pointer"
                      />
                    </div>
                    <div role="cell" className="px-5 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-sand overflow-hidden shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-body text-sm text-charcoal truncate">
                        {product.name}
                      </span>
                    </div>
                    <div role="cell" className="px-5">
                      <span className="font-body text-sm text-charcoal/70">
                        {product.category}
                      </span>
                    </div>
                    <div role="cell" className="px-5 text-right">
                      <span className="font-body text-sm text-charcoal/70 tabular-nums">
                        ₱{product.price}
                      </span>
                    </div>
                    <div role="cell" className="px-5 text-right">
                      <span className="font-body text-sm text-charcoal/70 tabular-nums">
                        {product.stockQuantity}
                      </span>
                    </div>
                    <div role="cell" className="px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                          product.stockQuantity <= 0
                            ? "bg-red-50 text-red-600"
                            : product.stockQuantity <= 10
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.stockQuantity <= 0
                              ? "bg-red-500"
                              : product.stockQuantity <= 10
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                        />
                        {product.stockQuantity <= 0
                          ? "Out of Stock"
                          : product.stockQuantity <= 10
                            ? "Low Stock"
                            : "In Stock"}
                      </span>
                    </div>
                    <div role="cell" className="px-5 flex items-center justify-end gap-4">
                      <button
                        onClick={() => openEditModal(product)}
                        className="font-body text-xs text-charcoal/60 hover:text-sage hover:scale-105 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setConfirmTarget({ type: "single", id: product.id })
                        }
                        className="font-body text-xs text-charcoal/60 hover:text-red-600 hover:scale-105 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {!isLoading && products.length === 0 && (
            <div role="row" className="px-5 py-10">
              <div role="cell" className="flex flex-col items-center gap-2 text-center">
                <Package className="w-8 h-8 text-charcoal/20" />
                <span className="font-body text-sm text-charcoal/40">
                  No products match your filters.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && products.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="font-body text-xs text-charcoal/50">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Archived products toggle + list — fetched lazily, only when opened */}
      {stats.archived > 0 && (
        <div className="mt-6">
          <button
            onClick={handleToggleArchived}
            className="flex items-center gap-1.5 font-body text-xs text-charcoal/50 hover:text-charcoal"
            aria-expanded={showArchived}
          >
            <motion.span
              animate={{ rotate: showArchived ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.span>
            <span className="underline">
              {showArchived ? "Hide" : "Show"} Archived Products (
              {stats.archived})
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden mt-4">
                  {archivedLoading ? (
                    <div className="px-5 py-6 flex items-center gap-2 text-charcoal/50">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-body text-sm">Loading archived products...</span>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                            Product
                          </th>
                          <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                            Category
                          </th>
                          <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3 text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedProducts.map((product) => (
                          <tr
                            key={product.id}
                            className="border-b border-charcoal/5 last:border-0"
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-sand overflow-hidden shrink-0 opacity-50">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="font-body text-sm text-charcoal/60">
                                  {product.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-body text-sm text-charcoal/50">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => handleRestore(product.id)}
                                className="font-body text-xs text-sage hover:text-charcoal transition-colors"
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        editingProduct={editingProduct}
        onClose={() => setModalOpen(false)}
        onSaved={handleProductSaved}
      />

      <ConfirmDialog
        {...confirmDialogProps}
        destructive
        onConfirm={handleConfirmedDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}