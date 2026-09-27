// app/admin/(dashboard)/cms/faq/FaqItemsTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
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

export default function FaqItemsTab({ onError }: { onError: (msg: string) => void }) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/faq", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setItems(data.items);
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

  function updateLocal<K extends keyof FaqItem>(id: number, field: K, value: FaqItem[K]) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  async function handleSave(item: FaqItem) {
    setSavingId(item.id);
    try {
      const res = await fetch(`/api/cms/admin/faq/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          question: item.question,
          answer: item.answer,
          sort_order: item.sort_order,
          is_active: item.is_active,
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
    if (!confirm("Delete this FAQ item?")) return;
    try {
      const res = await fetch(`/api/cms/admin/faq/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/faq", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          question: "New question?",
          answer: "Answer here.",
          sort_order: items.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setItems((prev) => [...prev, data.item]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((it, i) => ({ ...it, sort_order: i }));
    setItems(withOrders);
    await Promise.all(
      [withOrders[index], withOrders[target]].map((it) =>
        fetch(`/api/cms/admin/faq/${it.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            question: it.question,
            answer: it.answer,
            sort_order: it.sort_order,
            is_active: it.is_active,
          }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
          <div className="flex flex-col gap-1 pt-1">
            <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => handleMove(i, 1)} disabled={i === items.length - 1} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Question</label>
              <input type="text" value={item.question} onChange={(e) => updateLocal(item.id, "question", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Answer</label>
              <textarea value={item.answer} onChange={(e) => updateLocal(item.id, "answer", e.target.value)} rows={3} className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input type="checkbox" checked={item.is_active} onChange={(e) => updateLocal(item.id, "is_active", e.target.checked)} />
              Active (visible on storefront)
            </label>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => handleSave(item)} disabled={savingId === item.id} className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50">
              {savingId === item.id ? "..." : "Save"}
            </button>
            <button onClick={() => handleDelete(item.id)} className="text-charcoal/40 hover:text-red-500 self-center">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleAdd} disabled={savingId === "new"} className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal transition-colors">
        <Plus size={16} /> Add FAQ Item
      </button>
    </div>
  );
}