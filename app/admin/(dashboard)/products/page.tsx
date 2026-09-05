"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Package,
  Loader2,
  Plus,
  UploadCloud,
  X,
  ImageIcon,
} from "lucide-react";
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

const emptyForm = {
  name: "",
  category: "Leaf Tea" as Product["category"],
  subCategory: "",
  type: "",
  price: "",
  image: "",
  description: "",
  stockQuantity: "",
};

// Single source of truth for the availability badge + stat chips.
// Tune these two numbers to change what counts as "Low Stock" everywhere.
const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK_MAX: 10,
} as const;

function getAvailability(stockQuantity: number): "out" | "low" | "in" {
  if (stockQuantity <= STOCK_THRESHOLDS.OUT_OF_STOCK) return "out";
  if (stockQuantity <= STOCK_THRESHOLDS.LOW_STOCK_MAX) return "low";
  return "in";
}

type SortKey = "name" | "price" | "stockQuantity";
type FieldErrors = Partial<
  Record<
    "name" | "price" | "stockQuantity" | "description" | "subCategory" | "type" | "image",
    string
  >
>;

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

export default function AdminProductsPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<MainCategory | "All">(
    "All",
  );
  const [filterSubCategory, setFilterSubCategory] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  // Build/revoke a preview URL whenever a new image file is chosen.
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load products.");
      setProducts(data.products);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const activeProducts = products.filter((p) => !p.isArchived);
  const archivedProducts = products.filter((p) => p.isArchived);

  const lowStockCount = activeProducts.filter(
    (p) => getAvailability(p.stockQuantity) === "low",
  ).length;
  const outOfStockCount = activeProducts.filter(
    (p) => getAvailability(p.stockQuantity) === "out",
  ).length;

  const filtered = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "All" ||
      p.category === filterCategory ||
      (filterCategory === "Tea Accessories" && p.category === "Accessories");
    const matchesSubCategory =
      filterSubCategory === "All" ||
      (p as any).subCategory === filterSubCategory;
    return matchesSearch && matchesCategory && matchesSubCategory;
  });

  const sortedFiltered = useMemo(() => {
    if (!sortConfig) return filtered;
    const { key, direction } = sortConfig;
    return [...filtered].sort((a, b) => {
      let aVal: string | number = (a as any)[key];
      let bVal: string | number = (b as any)[key];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [filtered, sortConfig]);

  // Drop any selections that scrolled out of the current filtered/sorted view
  // (e.g. after a filter change) so the bulk bar never references stale rows.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(sortedFiltered.map((p) => p.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFiltered]);

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
    sortedFiltered.length > 0 &&
    sortedFiltered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      return new Set(sortedFiltered.map((p) => p.id));
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

    const succeededIds = new Set(
      results
        .filter(
          (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
        )
        .map((r) => r.value),
    );
    const failedCount = results.length - succeededIds.size;

    if (succeededIds.size > 0) {
      setProducts((prev) =>
        prev.map((p) =>
          succeededIds.has(p.id) ? { ...p, isArchived: true } : p,
        ),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    if (failedCount > 0) {
      setActionError(
        ids.length === 1
          ? "Unable to remove product."
          : `Removed ${succeededIds.size} of ${ids.length} products — ${failedCount} failed.`,
      );
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
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isArchived: false } : p)),
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setFieldErrors({});
    setSaveError("");
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      subCategory: (product as any).subCategory || "",
      type: (product as any).type || "",
      price: product.price.toString(),
      image: product.image,
      description: product.description,
      stockQuantity: product.stockQuantity.toString(),
    });
    setImageFile(null);
    setFieldErrors({});
    setSaveError("");
    setModalOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "category") {
      setForm((prev) => ({
        ...prev,
        category: value as Product["category"],
        subCategory: "",
        type: "",
      }));
      return;
    }

    if (name === "subCategory") {
      setForm((prev) => ({ ...prev, subCategory: value, type: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Mirror handleChange's behavior for the three CustomSelect-driven fields,
  // since they report a plain value rather than a change event.
  const handleCategorySelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      category: value as Product["category"],
      subCategory: "",
      type: "",
    }));
  };

  const handleSubCategorySelect = (value: string) => {
    setFieldErrors((prev) => ({ ...prev, subCategory: undefined }));
    setForm((prev) => ({ ...prev, subCategory: value, type: "" }));
  };

  const handleTypeSelect = (value: string) => {
    setFieldErrors((prev) => ({ ...prev, type: undefined }));
    setForm((prev) => ({ ...prev, type: value }));
  };

  const applyImageFile = (file: File | null) => {
    setImageFile(file);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyImageFile(e.target.files?.[0] || null);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      applyImageFile(file);
    }
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.price || parseFloat(form.price) <= 0)
      errors.price = "Enter a valid price.";
    if (form.stockQuantity === "" || parseInt(form.stockQuantity, 10) < 0)
      errors.stockQuantity = "Enter a valid stock quantity.";
    if (!form.description.trim())
      errors.description = "Description is required.";
    if (categoryTree[form.category as MainCategory] && !form.subCategory)
      errors.subCategory = "Select a subcategory.";
    if (form.subCategory && !form.type) errors.type = "Select a type.";
    if (!editingId && !imageFile)
      errors.image = "Please select an image to add the new product.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    if (!validate()) return;

    setIsSaving(true);
    const token = localStorage.getItem("token");
    let imageUrl = form.image;

    try {
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);

        const uploadRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadData,
        });
        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadResult.error || "Image upload failed.");
        }
        imageUrl = uploadResult.url;
      }

      const payload = {
        name: form.name,
        category: form.category,
        subCategory: form.subCategory,
        type: form.type,
        price: parseFloat(form.price),
        image: imageUrl,
        description: form.description,
        stockQuantity: parseInt(form.stockQuantity, 10) || 0,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to update product.");
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? { ...data.product, isArchived: p.isArchived }
              : p,
          ),
        );
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to add product.");
        setProducts((prev) => [
          ...prev,
          { ...data.product, isArchived: false },
        ]);
      }

      setModalOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsSaving(false);
    }
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
                  key={sortedFiltered.length}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  {sortedFiltered.length} of {activeProducts.length} products
                </motion.span>
              </AnimatePresence>
            )}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-charcoal text-cream font-body text-sm px-5 py-2.5 hover:bg-sage transition-colors rounded-full shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadProducts} />
      <ErrorBanner message={actionError} />

      {/* Stat chips */}
      {!isLoading && (
        <div className="flex flex-wrap gap-3 mb-6">
          <StatChip label="Active Products" value={activeProducts.length} />
          <StatChip label="Low Stock" value={lowStockCount} tone="warning" />
          <StatChip label="Out of Stock" value={outOfStockCount} tone="danger" />
        </div>
      )}

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
                disabled={sortedFiltered.length === 0}
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
            Array.from({ length: 5 }).map((_, i) => (
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
              {sortedFiltered.map((product, index) => {
                const availability = getAvailability(product.stockQuantity);
                const isSelected = selectedIds.has(product.id);
                return (
                  <motion.div
                    key={product.id}
                    role="row"
                    layout
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
                          availability === "out"
                            ? "bg-red-50 text-red-600"
                            : availability === "low"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            availability === "out"
                              ? "bg-red-500"
                              : availability === "low"
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                        />
                        {availability === "out"
                          ? "Out of Stock"
                          : availability === "low"
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

          {!isLoading && sortedFiltered.length === 0 && (
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

      {/* Archived products toggle + list */}
      {archivedProducts.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((prev) => !prev)}
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
              {archivedProducts.length})
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit slide-over panel */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-charcoal/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !isSaving && setModalOpen(false)}
          >
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-charcoal/10 sticky top-0 bg-white z-10">
                <h2
                  id="product-modal-title"
                  className="font-body text-lg font-medium text-charcoal"
                >
                  {editingId ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  type="button"
                  onClick={() => !isSaving && setModalOpen(false)}
                  aria-label="Close"
                  className="text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-8 py-6">
                <ErrorBanner message={saveError} />

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold">
                      Basic Info
                    </h3>
                    <div>
                      <label
                        htmlFor="product-name"
                        className="font-body text-xs text-charcoal/60 block mb-1.5"
                      >
                        Name
                      </label>
                      <input
                        id="product-name"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        aria-invalid={!!fieldErrors.name}
                        aria-describedby={fieldErrors.name ? "name-error" : undefined}
                        className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.name
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                        }`}
                      />
                      {fieldErrors.name && (
                        <p id="name-error" className="font-body text-xs text-red-600 mt-1">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="product-category"
                        className="font-body text-xs text-charcoal/60 block mb-1.5"
                      >
                        Category
                      </label>
                      <CustomSelect
                        id="product-category"
                        value={form.category}
                        onChange={handleCategorySelect}
                        options={[
                          { value: "Leaf Tea", label: "Leaf Tea" },
                          { value: "Matcha", label: "Matcha" },
                          { value: "Tea Accessories", label: "Tea Accessories" },
                        ]}
                        triggerClassName="w-full bg-white rounded-xl border border-charcoal/20 px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                      />
                    </div>

                    <AnimatePresence initial={false}>
                      {categoryTree[form.category as MainCategory] && (
                        <motion.div
                          key="subcategory"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div>
                            <label
                              htmlFor="product-subcategory"
                              className="font-body text-xs text-charcoal/60 block mb-1.5"
                            >
                              Subcategory
                            </label>
                            <CustomSelect
                              id="product-subcategory"
                              value={form.subCategory}
                              onChange={handleSubCategorySelect}
                              placeholder="Select subcategory..."
                              invalid={!!fieldErrors.subCategory}
                              options={Object.keys(
                                categoryTree[form.category as MainCategory],
                              ).map((sub) => ({ value: sub, label: sub }))}
                              triggerClassName={`w-full bg-white rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.subCategory
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                              }`}
                            />
                            {fieldErrors.subCategory && (
                              <p className="font-body text-xs text-red-600 mt-1">
                                {fieldErrors.subCategory}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence initial={false}>
                      {form.subCategory && (
                        <motion.div
                          key="type"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div>
                            <label
                              htmlFor="product-type"
                              className="font-body text-xs text-charcoal/60 block mb-1.5"
                            >
                              Type
                            </label>
                            <CustomSelect
                              id="product-type"
                              value={form.type}
                              onChange={handleTypeSelect}
                              placeholder="Select type..."
                              invalid={!!fieldErrors.type}
                              options={(
                                (categoryTree[form.category as MainCategory] as any)[
                                  form.subCategory
                                ] as string[]
                              ).map((t) => ({ value: t, label: t }))}
                              triggerClassName={`w-full bg-white rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.type
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                              }`}
                            />
                            {fieldErrors.type && (
                              <p className="font-body text-xs text-red-600 mt-1">
                                {fieldErrors.type}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pricing & Inventory */}
                  <div className="space-y-4 pt-2 border-t border-charcoal/10">
                    <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold pt-4">
                      Pricing &amp; Inventory
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="product-price"
                          className="font-body text-xs text-charcoal/60 block mb-1.5"
                        >
                          Price (₱)
                        </label>
                        <input
                          id="product-price"
                          type="number"
                          step="0.01"
                          name="price"
                          value={form.price}
                          onChange={handleChange}
                          required
                          aria-invalid={!!fieldErrors.price}
                          aria-describedby={fieldErrors.price ? "price-error" : undefined}
                          className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.price
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                          }`}
                        />
                        {fieldErrors.price && (
                          <p id="price-error" className="font-body text-xs text-red-600 mt-1">
                            {fieldErrors.price}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="product-stock"
                          className="font-body text-xs text-charcoal/60 block mb-1.5"
                        >
                          Stock Quantity
                        </label>
                        <input
                          id="product-stock"
                          type="number"
                          step="1"
                          min="0"
                          name="stockQuantity"
                          value={form.stockQuantity}
                          onChange={handleChange}
                          required
                          aria-invalid={!!fieldErrors.stockQuantity}
                          aria-describedby={
                            fieldErrors.stockQuantity ? "stock-error" : undefined
                          }
                          className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.stockQuantity
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                          }`}
                        />
                        {fieldErrors.stockQuantity && (
                          <p id="stock-error" className="font-body text-xs text-red-600 mt-1">
                            {fieldErrors.stockQuantity}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-body text-xs text-charcoal/40 -mt-2">
                      Availability is automatically set based on stock quantity.
                    </p>
                  </div>

                  {/* Media */}
                  <div className="space-y-3 pt-2 border-t border-charcoal/10">
                    <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold pt-4">
                      Media
                    </h3>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleImageDrop}
                      className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                        isDraggingImage
                          ? "border-sage bg-sage/5"
                          : fieldErrors.image
                            ? "border-red-400"
                            : "border-charcoal/20 hover:border-sage/60"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {imagePreviewUrl || (form.image && !imageFile) ? (
                          <img
                            src={imagePreviewUrl || form.image}
                            alt={imagePreviewUrl ? "New image preview" : "Current"}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-sand/60 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-charcoal/40" />
                          </div>
                        )}

                        <p className="font-body text-xs text-charcoal/60">
                          {imageFile
                            ? imageFile.name
                            : "Drag an image here, or"}
                        </p>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 font-body text-xs text-charcoal underline hover:text-sage transition-colors"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          {editingId && form.image ? "Replace image" : "Browse files"}
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        id="product-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    {fieldErrors.image && (
                      <p className="font-body text-xs text-red-600">
                        {fieldErrors.image}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-4 pt-2 border-t border-charcoal/10">
                    <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold pt-4">
                      Description
                    </h3>
                    <div>
                      <textarea
                        id="product-description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        required
                        aria-invalid={!!fieldErrors.description}
                        aria-describedby={
                          fieldErrors.description ? "description-error" : undefined
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.description
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                        }`}
                      />
                      {fieldErrors.description && (
                        <p
                          id="description-error"
                          className="font-body text-xs text-red-600 mt-1"
                        >
                          {fieldErrors.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`flex-1 font-body text-sm py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 ${
                        isSaving
                          ? "bg-charcoal/60 text-cream cursor-not-allowed"
                          : "bg-charcoal text-cream hover:bg-sage"
                      }`}
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaving
                        ? "Saving..."
                        : editingId
                          ? "Save Changes"
                          : "Add Product"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={isSaving}
                      className={`flex-1 border border-charcoal/20 text-charcoal font-body text-sm py-2.5 rounded-full transition-colors ${
                        isSaving
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-sand/30"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        {...confirmDialogProps}
        destructive
        onConfirm={handleConfirmedDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}