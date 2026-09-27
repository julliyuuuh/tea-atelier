// app/admin/(dashboard)/cms/home/CategoriesTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface Category {
  id: number;
  name: string;
  image: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const inputClass =
  "w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass = "block text-xs font-medium text-charcoal/60 mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function CategoriesTab({ onError }: { onError: (msg: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/categories", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setCategories(data.categories);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLocal<K extends keyof Category>(id: number, field: K, value: Category[K]) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  async function handleSave(cat: Category) {
    setSavingId(cat.id);
    try {
      const res = await fetch(`/api/cms/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: cat.name,
          image: cat.image,
          description: cat.description,
          sort_order: cat.sort_order,
          is_active: cat.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/cms/admin/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/categories", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: "New Category",
          image: "/images/placeholder.png",
          description: "Description here.",
          sort_order: categories.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setCategories((prev) => [...prev, data.category]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(withOrders);

    await Promise.all(
      [withOrders[index], withOrders[target]].map((c) =>
        fetch(`/api/cms/admin/categories/${c.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            name: c.name,
            image: c.image,
            description: c.description,
            sort_order: c.sort_order,
            is_active: c.is_active,
          }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {categories.map((cat, i) => (
        <div key={cat.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={() => handleMove(i, -1)}
              disabled={i === 0}
              className="text-charcoal/40 hover:text-sage disabled:opacity-20"
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => handleMove(i, 1)}
              disabled={i === categories.length - 1}
              className="text-charcoal/40 hover:text-sage disabled:opacity-20"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateLocal(cat.id, "name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <input
                  type="text"
                  value={cat.image}
                  onChange={(e) => updateLocal(cat.id, "image", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={cat.description}
                onChange={(e) => updateLocal(cat.id, "description", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input
                type="checkbox"
                checked={cat.is_active}
                onChange={(e) => updateLocal(cat.id, "is_active", e.target.checked)}
              />
              Active (visible on storefront)
            </label>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => handleSave(cat)}
              disabled={savingId === cat.id}
              className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              {savingId === cat.id ? "..." : "Save"}
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="text-charcoal/40 hover:text-red-500 self-center"
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        disabled={savingId === "new"}
        className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal transition-colors"
      >
        <Plus size={16} /> Add Category
      </button>
    </div>
  );
}