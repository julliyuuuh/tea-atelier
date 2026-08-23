"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Product } from "@/lib/products";
import { categoryTree, type MainCategory } from "@/lib/categories";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import { SkeletonBlock } from "@/components/Skeleton";

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

type SortKey = "name" | "price" | "stockQuantity";
type SortConfig = { key: SortKey; direction: "asc" | "desc" } | null;
type FieldErrors = Partial<
  Record<
    "name" | "price" | "stockQuantity" | "description" | "subCategory" | "type" | "image",
    string
  >
>;

// Shared column layout so the header, skeleton rows, and data rows always line up.
const GRID_COLS =
  "minmax(220px,2.2fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(120px,1.1fr) minmax(130px,1fr)";

/** Small inline banner used everywhere an alert() used to fire. */
function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 bg-red-50 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-body text-sm text-red-600">{message}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="font-body text-xs text-red-600 hover:text-red-700 underline shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Clickable column header with an active-sort chevron indicator. */
function SortHeader({
  label,
  sortKeyName,
  sortConfig,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortConfig?.key === sortKeyName;
  const ariaSort = isActive
    ? sortConfig!.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <div role="columnheader" aria-sort={ariaSort as any} className="px-5 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className={`flex items-center gap-1 font-body text-xs uppercase tracking-wide transition-colors ${
          isActive ? "text-charcoal" : "text-charcoal/50 hover:text-charcoal/70"
        }`}
      >
        {label}
        {isActive &&
          (sortConfig!.direction === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          ))}
      </button>
    </div>
  );
}

export default function AdminProductsPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

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

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setActionError("");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to remove product.");
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isArchived: true } : p)),
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
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

  const rowVariants = {
    initial: { opacity: 0, y: 8 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, delay: Math.min(i, 8) * 0.02 },
    }),
    exit: {
      opacity: 0,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
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
          className="bg-charcoal text-cream font-body text-sm px-5 py-2.5 hover:bg-sage transition-colors rounded-full"
        >
          + Add Product
        </button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadProducts} />
      <ErrorBanner message={actionError} />

      {/* Search + Category/Subcategory filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-sm border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors rounded-full"
        />

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value as MainCategory | "All");
            setFilterSubCategory("All");
          }}
          className="border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors rounded-full"
        >
          <option value="All">All Categories</option>
          {(Object.keys(categoryTree) as MainCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {filterCategory !== "All" && categoryTree[filterCategory] && (
          <select
            value={filterSubCategory}
            onChange={(e) => setFilterSubCategory(e.target.value)}
            className="border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors rounded-full"
          >
            <option value="All">All Subcategories</option>
            {Object.keys(categoryTree[filterCategory]).map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
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

      <div
        className="bg-white border border-charcoal/10 rounded-xl overflow-hidden"
        role="table"
        aria-label="Products"
      >
        <div role="rowgroup">
          <div
            role="row"
            className="grid border-b border-charcoal/10"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <SortHeader
              label="Product"
              sortKeyName="name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <div
              role="columnheader"
              className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3"
            >
              Category
            </div>
            <SortHeader
              label="Price"
              sortKeyName="price"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <SortHeader
              label="Stock"
              sortKeyName="stockQuantity"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <div
              role="columnheader"
              className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3"
            >
              Availability
            </div>
            <div
              role="columnheader"
              className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3 text-right"
            >
              Actions
            </div>
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
                <div className="px-5 flex items-center gap-3">
                  <SkeletonBlock className="w-10 h-10 shrink-0" />
                  <SkeletonBlock className="h-4 w-32" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-12" />
                </div>
                <div className="px-5">
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
              {sortedFiltered.map((product, index) => (
                <motion.div
                  key={product.id}
                  role="row"
                  layout
                  custom={index}
                  variants={rowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="grid items-center py-3 border-b border-charcoal/5 last:border-0 hover:bg-sand/20 hover:shadow-sm transition-colors overflow-hidden group"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
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
                  <div role="cell" className="px-5">
                    <span className="font-body text-sm text-charcoal/70">
                      ₱{product.price}
                    </span>
                  </div>
                  <div role="cell" className="px-5">
                    <span className="font-body text-sm text-charcoal/70">
                      {product.stockQuantity}
                    </span>
                  </div>
                  <div role="cell" className="px-5">
                    <span
                      className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                        product.stockQuantity === 0
                          ? "bg-red-50 text-red-600"
                          : product.stockQuantity <= 10
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          product.stockQuantity === 0
                            ? "bg-red-500"
                            : product.stockQuantity <= 10
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                      />
                      {product.stockQuantity === 0
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
                      onClick={() => setConfirmDeleteId(product.id)}
                      className="font-body text-xs text-charcoal/60 hover:text-red-600 hover:scale-105 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
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

      {/* Modal to edit or add product */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-white w-full max-w-md p-8 max-h-[90vh] overflow-y-auto rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-modal-title"
            >
              <h2
                id="product-modal-title"
                className="font-body text-lg font-medium text-charcoal mb-6"
              >
                {editingId ? "Edit Product" : "Add Product"}
              </h2>

              <ErrorBanner message={saveError} />

              <form onSubmit={handleSave} className="space-y-4">
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
                  <select
                    id="product-category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-charcoal/20 px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  >
                    <option>Leaf Tea</option>
                    <option>Matcha</option>
                    <option>Tea Accessories</option>
                  </select>
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
                        <select
                          id="product-subcategory"
                          name="subCategory"
                          value={form.subCategory}
                          onChange={handleChange}
                          required
                          aria-invalid={!!fieldErrors.subCategory}
                          className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.subCategory
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                          }`}
                        >
                          <option value="">Select subcategory...</option>
                          {Object.keys(
                            categoryTree[form.category as MainCategory],
                          ).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
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
                        <select
                          id="product-type"
                          name="type"
                          value={form.type}
                          onChange={handleChange}
                          required
                          aria-invalid={!!fieldErrors.type}
                          className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.type
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                          }`}
                        >
                          <option value="">Select type...</option>
                          {(categoryTree[form.category as MainCategory] as any)[
                            form.subCategory
                          ].map((t: string) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.type && (
                          <p className="font-body text-xs text-red-600 mt-1">
                            {fieldErrors.type}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                <div>
                  <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                    Product Image
                  </label>

                  <label
                    htmlFor="product-image-upload"
                    className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal cursor-pointer flex items-center justify-between transition-colors ${
                      fieldErrors.image
                        ? "border-red-500"
                        : "border-charcoal/20 hover:border-sage"
                    }`}
                  >
                    <span className="truncate">
                      {imageFile ? imageFile.name : "Choose File"}
                    </span>
                    <span className="text-charcoal/40 text-xs shrink-0 ml-2">
                      Browse
                    </span>
                  </label>

                  <input
                    id="product-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {fieldErrors.image && (
                    <p className="font-body text-xs text-red-600 mt-1">
                      {fieldErrors.image}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    {form.image && !imageFile && (
                      <img
                        src={form.image}
                        alt="Current"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <AnimatePresence>
                      {imagePreviewUrl && (
                        <motion.img
                          key={imagePreviewUrl}
                          src={imagePreviewUrl}
                          alt="New image preview"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="product-description"
                    className="font-body text-xs text-charcoal/60 block mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
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

                <div className="flex gap-3 pt-2">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remove this product?"
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}