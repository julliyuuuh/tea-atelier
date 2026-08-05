"use client";

import React, { useState, useEffect } from "react";
import type { Product } from "@/lib/products";
import { categoryTree, type MainCategory } from "@/lib/categories";

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

export default function AdminProductsPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
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

  const filtered = activeProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this product?")) return;

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
      alert(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const handleRestore = async (id: string) => {
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
      alert(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
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
    setModalOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId && !imageFile) {
      alert("Please select an image to add the new product.");
      return;
    }

    const token = localStorage.getItem("token");

    let imageUrl = form.image;

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
        alert(uploadResult.error || "Image upload failed.");
        return;
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

    try {
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
      alert(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
            Products
          </h1>
          <p className="font-body text-sm text-charcoal/60">
            {isLoading
              ? "Loading..."
              : `${activeProducts.length} products total`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-charcoal text-cream font-body text-sm px-5 py-2.5 hover:bg-sage transition-colors rounded-full"
        >
          + Add Product
        </button>
      </div>

      {errorMessage && (
        <p className="font-body text-sm text-red-600 mb-4">{errorMessage}</p>
      )}

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal mb-6 focus:outline-none focus:border-sage transition-colors rounded-full"
      />

      <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-charcoal/10">
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Product
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Category
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Price
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Stock
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Availability
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.id}
                className="border-b border-charcoal/5 last:border-0 hover:bg-sand/20 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sand overflow-hidden shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-body text-sm text-charcoal">
                      {product.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    {product.category}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    ₱{product.price}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    {product.stockQuantity}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                      product.stockQuantity === 0
                        ? "bg-red-50 text-red-600"
                        : product.stockQuantity <= 10
                          ? "bg-amber-50 text-amber-700"
                          : "bg-sage/15 text-sage"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        product.stockQuantity === 0
                          ? "bg-red-500"
                          : product.stockQuantity <= 10
                            ? "bg-amber-500"
                            : "bg-sage"
                      }`}
                    />
                    {product.stockQuantity === 0
                      ? "Out of Stock"
                      : product.stockQuantity <= 10
                        ? "Low Stock"
                        : "In Stock"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => openEditModal(product)}
                    className="font-body text-xs text-charcoal/60 hover:text-sage transition-colors mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="font-body text-xs text-charcoal/60 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Archived products toggle + list */}
      {archivedProducts.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((prev) => !prev)}
            className="font-body text-xs text-charcoal/50 hover:text-charcoal underline"
          >
            {showArchived ? "Hide" : "Show"} Archived Products (
            {archivedProducts.length})
          </button>

          {showArchived && (
            <div className="bg-white border border-charcoal/10 rounded-x1 overflow-hidden mt-4">
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
                          <div className="w-10 h-10 bg-sand overflow-hidden shrink-0 opacity-50">
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
          )}
        </div>
      )}

      {/*Modal to edit or add product*/}
      {modalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-md p-8 max-h-[90vh] overflow-y-auto rounded-2x1">
            <h2 className="font-body text-lg font-medium text-charcoal mb-6">
              {editingId ? "Edit Product" : "Add Product"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-x1 border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Category
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
                >
                  <option>Leaf Tea</option>
                  <option>Matcha</option>
                  <option>Tea Accessories</option>
                </select>
              </div>

              {categoryTree[form.category as MainCategory] && (
                <div>
                  <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                    Subcategory
                  </label>
                  <select
                    name="subCategory"
                    value={form.subCategory}
                    onChange={handleChange}
                    required
                    className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
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
                </div>
              )}

              {form.subCategory && (
                <div>
                  <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                    Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                    className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
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
                </div>
              )}

              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  name="stockQuantity"
                  value={form.stockQuantity}
                  onChange={handleChange}
                  required
                  className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
                />
                <p className="font-body text-xs text-charcoal/40 mt-1">
                  Availability is automatically set based on inputted number.
                </p>
              </div>

              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Product Image
                </label>

                <label
                  htmlFor="product-image-upload"
                  className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal cursor-pointer flex items-center justify-between hover:border-sage transition-colors"
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
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {form.image && !imageFile && (
                  <img
                    src={form.image}
                    alt="Current"
                    className="w-16 h-16 object-cover mt-2"
                  />
                )}
              </div>

              <div>
                <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  required
                  className="w-full border border-charcoal/20 px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-charcoal text-cream font-body text-sm py-2.5 hover:bg-sage transition-colors rounded-full"
                >
                  {editingId ? "Save Changes" : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border border-charcoal/20 text-charcoal font-body text-sm py-2.5 hover:bg-sand/30 transition-colors rounded-full"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
