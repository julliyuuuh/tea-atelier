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