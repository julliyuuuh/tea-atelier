"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import { SkeletonBlock }  from "@/components/Skeleton";

interface Reason {
  id: number;
  title: string;
  copy: string;
  sort_order: number;
}

const inputClass =
  "w-full border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#202721] text-charcoal dark:text-[#dfe7dd] px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass =
  "block text-xs font-medium text-charcoal/60 dark:text-[#aebbad] mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function WhyChooseUsTab() {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/why-choose-us", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setReasons(data.reasons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateLocal(id: number, field: "title" | "copy", value: string) {
    setReasons((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSave(reason: Reason) {
    setSavingId(reason.id);
    setError(null);
    try {
      const res = await fetch(`/api/cms/admin/why-choose-us/${reason.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title: reason.title,
          copy: reason.copy,
          sort_order: reason.sort_order,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this reason?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/cms/admin/why-choose-us/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setReasons((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    setError(null);
    try {
      const res = await fetch("/api/cms/admin/why-choose-us", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: "New Reason",
          copy: "Description here.",
          sort_order: reasons.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setReasons((prev) => [...prev, data.reason]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= reasons.length) return;

    const reordered = [...reasons];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((r, i) => ({ ...r, sort_order: i }));
    setReasons(withOrders);

    // Persist both swapped rows
    await Promise.all(
      [withOrders[index], withOrders[target]].map((r) =>
        fetch(`/api/cms/admin/why-choose-us/${r.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ title: r.title, copy: r.copy, sort_order: r.sort_order }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      {reasons.map((reason, i) => (
        <div
          key={reason.id}
          className="border border-charcoal/10 dark:border-white/10 rounded-xl p-4 flex gap-4"
        >
          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={() => handleMove(i, -1)}
              disabled={i === 0}
              className="text-charcoal/40 dark:text-[#aebbad] hover:text-sage disabled:opacity-20"
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => handleMove(i, 1)}
              disabled={i === reasons.length - 1}
              className="text-charcoal/40 dark:text-[#aebbad] hover:text-sage disabled:opacity-20"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                value={reason.title}
                onChange={(e) => updateLocal(reason.id, "title", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Copy</label>
              <textarea
                value={reason.copy}
                onChange={(e) => updateLocal(reason.id, "copy", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => handleSave(reason)}
              disabled={savingId === reason.id}
              className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              {savingId === reason.id ? "..." : "Save"}
            </button>
            <button
              onClick={() => handleDelete(reason.id)}
              className="text-charcoal/40 dark:text-[#aebbad] hover:text-red-500 self-center"
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
        className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal dark:hover:text-[#dfe7dd] transition-colors"
      >
        <Plus size={16} /> Add Reason
      </button>
    </div>
  );
}