"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface Pillar {
  id: number;
  title: string;
  copy: string;
  sort_order: number;
}

const inputClass =
  "w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass = "block text-xs font-medium text-charcoal/60 mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AboutPillarsTab({ onError }: { onError: (msg: string) => void }) {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/about-pillars", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setPillars(data.pillars);
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

  function updateLocal(id: number, field: "title" | "copy", value: string) {
    setPillars((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleSave(pillar: Pillar) {
    setSavingId(pillar.id);
    try {
      const res = await fetch(`/api/cms/admin/about-pillars/${pillar.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ title: pillar.title, copy: pillar.copy, sort_order: pillar.sort_order }),
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
    if (!confirm("Delete this pillar?")) return;
    try {
      const res = await fetch(`/api/cms/admin/about-pillars/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setPillars((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/about-pillars", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title: "New Pillar", copy: "Description here.", sort_order: pillars.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setPillars((prev) => [...prev, data.pillar]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pillars.length) return;
    const reordered = [...pillars];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((p, i) => ({ ...p, sort_order: i }));
    setPillars(withOrders);
    await Promise.all(
      [withOrders[index], withOrders[target]].map((p) =>
        fetch(`/api/cms/admin/about-pillars/${p.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ title: p.title, copy: p.copy, sort_order: p.sort_order }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {pillars.map((pillar, i) => (
        <div key={pillar.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
          <div className="flex flex-col gap-1 pt-1">
            <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => handleMove(i, 1)} disabled={i === pillars.length - 1} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input type="text" value={pillar.title} onChange={(e) => updateLocal(pillar.id, "title", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Copy</label>
              <textarea value={pillar.copy} onChange={(e) => updateLocal(pillar.id, "copy", e.target.value)} rows={2} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => handleSave(pillar)} disabled={savingId === pillar.id} className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50">
              {savingId === pillar.id ? "..." : "Save"}
            </button>
            <button onClick={() => handleDelete(pillar.id)} className="text-charcoal/40 hover:text-red-500 self-center">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleAdd} disabled={savingId === "new"} className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal transition-colors">
        <Plus size={16} /> Add Pillar
      </button>
    </div>
  );
}