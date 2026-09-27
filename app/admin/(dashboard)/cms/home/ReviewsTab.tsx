// app/admin/(dashboard)/cms/home/ReviewsTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface Review {
  id: number;
  quote: string;
  name: string;
  rating: number;
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

export default function ReviewsTab({ onError }: { onError: (msg: string) => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/reviews", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setReviews(data.reviews);
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

  function updateLocal<K extends keyof Review>(id: number, field: K, value: Review[K]) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSave(review: Review) {
    setSavingId(review.id);
    try {
      const res = await fetch(`/api/cms/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          quote: review.quote,
          name: review.name,
          rating: review.rating,
          sort_order: review.sort_order,
          is_active: review.is_active,
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
    if (!confirm("Delete this review?")) return;
    try {
      const res = await fetch(`/api/cms/admin/reviews/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/reviews", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          quote: "New testimonial here.",
          name: "Customer Name",
          rating: 5,
          sort_order: reviews.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setReviews((prev) => [...prev, data.review]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= reviews.length) return;

    const reordered = [...reviews];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((r, i) => ({ ...r, sort_order: i }));
    setReviews(withOrders);

    await Promise.all(
      [withOrders[index], withOrders[target]].map((r) =>
        fetch(`/api/cms/admin/reviews/${r.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            quote: r.quote,
            name: r.name,
            rating: r.rating,
            sort_order: r.sort_order,
            is_active: r.is_active,
          }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {reviews.map((review, i) => (
        <div key={review.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
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
              disabled={i === reviews.length - 1}
              className="text-charcoal/40 hover:text-sage disabled:opacity-20"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Quote</label>
              <textarea
                value={review.quote}
                onChange={(e) => updateLocal(review.id, "quote", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Customer Name</label>
                <input
                  type="text"
                  value={review.name}
                  onChange={(e) => updateLocal(review.id, "name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Rating</label>
                <select
                  value={review.rating}
                  onChange={(e) => updateLocal(review.id, "rating", Number(e.target.value))}
                  className={inputClass}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input
                type="checkbox"
                checked={review.is_active}
                onChange={(e) => updateLocal(review.id, "is_active", e.target.checked)}
              />
              Active (visible on storefront)
            </label>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => handleSave(review)}
              disabled={savingId === review.id}
              className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              {savingId === review.id ? "..." : "Save"}
            </button>
            <button
              onClick={() => handleDelete(review.id)}
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
        <Plus size={16} /> Add Review
      </button>
    </div>
  );
}