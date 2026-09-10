"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UploadCloud, X, ImageIcon } from "lucide-react";
import type { Product } from "@/lib/products";
import { categoryTree, type MainCategory } from "@/lib/categories";
import { ErrorBanner, CustomSelect } from "@/components/admin/AdminUI";

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

type FieldErrors = Partial
  Record
    "name" | "price" | "stockQuantity" | "description" | "subCategory" | "type" | "image",
    string
  >
>;

interface ProductFormModalProps {
  open: boolean;
  editingProduct: Product | null; // null = "add" mode
  onClose: () => void;
  onSaved: (product: Product, isNew: boolean) => void;
}

export default function ProductFormModal({
  open,
  editingProduct,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const editingId = editingProduct?.id ?? null;

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the modal opens, for either add or edit mode.
  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        category: editingProduct.category,
        subCategory: (editingProduct as any).subCategory || "",
        type: (editingProduct as any).type || "",
        price: editingProduct.price.toString(),
        image: editingProduct.image,
        description: editingProduct.description,
        stockQuantity: editingProduct.stockQuantity.toString(),
      });
    } else {
      setForm(emptyForm);
    }
    setImageFile(null);
    setFieldErrors({});
    setSaveError("");
  }, [open, editingProduct]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "category") {
      setForm((prev) => ({ ...prev, category: value as Product["category"], subCategory: "", type: "" }));
      return;
    }
    if (name === "subCategory") {
      setForm((prev) => ({ ...prev, subCategory: value, type: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (value: string) => {
    setForm((prev) => ({ ...prev, category: value as Product["category"], subCategory: "", type: "" }));
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
    if (file && file.type.startsWith("image/")) applyImageFile(file);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.price || parseFloat(form.price) <= 0) errors.price = "Enter a valid price.";
    if (form.stockQuantity === "" || parseInt(form.stockQuantity, 10) < 0)
      errors.stockQuantity = "Enter a valid stock quantity.";
    if (!form.description.trim()) errors.description = "Description is required.";
    if (categoryTree[form.category as MainCategory] && !form.subCategory)
      errors.subCategory = "Select a subcategory.";
    if (form.subCategory && !form.type) errors.type = "Select a type.";
    if (!editingId && !imageFile) errors.image = "Please select an image to add the new product.";
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
        if (!uploadRes.ok) throw new Error(uploadResult.error || "Image upload failed.");
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to update product.");
        onSaved(data.product, false);
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to add product.");
        onSaved(data.product, true);
      }

      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-charcoal/40 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => !isSaving && onClose()}
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
              <h2 id="product-modal-title" className="font-body text-lg font-medium text-charcoal">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <button
                type="button"
                onClick={() => !isSaving && onClose()}
                aria-label="Close"
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 py-6">
              <ErrorBanner message={saveError} />

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold">
                    Basic Info
                  </h3>
                  <div>
                    <label htmlFor="product-name" className="font-body text-xs text-charcoal/60 block mb-1.5">
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
                    <label htmlFor="product-category" className="font-body text-xs text-charcoal/60 block mb-1.5">
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
                          <label htmlFor="product-subcategory" className="font-body text-xs text-charcoal/60 block mb-1.5">
                            Subcategory
                          </label>
                          <CustomSelect
                            id="product-subcategory"
                            value={form.subCategory}
                            onChange={handleSubCategorySelect}
                            placeholder="Select subcategory..."
                            invalid={!!fieldErrors.subCategory}
                            options={Object.keys(categoryTree[form.category as MainCategory]).map((sub) => ({
                              value: sub,
                              label: sub,
                            }))}
                            triggerClassName={`w-full bg-white rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.subCategory
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                            }`}
                          />
                          {fieldErrors.subCategory && (
                            <p className="font-body text-xs text-red-600 mt-1">{fieldErrors.subCategory}</p>
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
                          <label htmlFor="product-type" className="font-body text-xs text-charcoal/60 block mb-1.5">
                            Type
                          </label>
                          <CustomSelect
                            id="product-type"
                            value={form.type}
                            onChange={handleTypeSelect}
                            placeholder="Select type..."
                            invalid={!!fieldErrors.type}
                            options={(
                              (categoryTree[form.category as MainCategory] as any)[form.subCategory] as string[]
                            ).map((t) => ({ value: t, label: t }))}
                            triggerClassName={`w-full bg-white rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                              fieldErrors.type
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                            }`}
                          />
                          {fieldErrors.type && (
                            <p className="font-body text-xs text-red-600 mt-1">{fieldErrors.type}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4 pt-2 border-t border-charcoal/10">
                  <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/40 font-semibold pt-4">
                    Pricing &amp; Inventory
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="product-price" className="font-body text-xs text-charcoal/60 block mb-1.5">
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
                      <label htmlFor="product-stock" className="font-body text-xs text-charcoal/60 block mb-1.5">
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
                        aria-describedby={fieldErrors.stockQuantity ? "stock-error" : undefined}
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
                        {imageFile ? imageFile.name : "Drag an image here, or"}
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
                    <p className="font-body text-xs text-red-600">{fieldErrors.image}</p>
                  )}
                </div>

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
                      aria-describedby={fieldErrors.description ? "description-error" : undefined}
                      className={`w-full rounded-xl border px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.description
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-charcoal/20 focus:border-sage focus:ring-sage/20"
                      }`}
                    />
                    {fieldErrors.description && (
                      <p id="description-error" className="font-body text-xs text-red-600 mt-1">
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
                      isSaving ? "bg-charcoal/60 text-cream cursor-not-allowed" : "bg-charcoal text-cream hover:bg-sage"
                    }`}
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onClose()}
                    disabled={isSaving}
                    className={`flex-1 border border-charcoal/20 text-charcoal font-body text-sm py-2.5 rounded-full transition-colors ${
                      isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-sand/30"
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
  );
}