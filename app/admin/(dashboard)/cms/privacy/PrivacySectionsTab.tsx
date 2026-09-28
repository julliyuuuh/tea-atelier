// app/admin/(dashboard)/cms/privacy/PrivacySectionsTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface Section {
  id: number;
  heading: string;
  body: string;
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

export default function PrivacySectionsTab({ onError }: { onError: (msg: string) => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/privacy-sections", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setSections(data.sections);
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

  function updateLocal<K extends keyof Section>(id: number, field: K, value: Section[K]) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function handleSave(section: Section) {
    setSavingId(section.id);
    try {
      const res = await fetch(`/api/cms/admin/privacy-sections/${section.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          heading: section.heading,
          body: section.body,
          sort_order: section.sort_order,
          is_active: section.is_active,
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
    if (!confirm("Delete this section?")) return;
    try {
      const res = await fetch(`/api/cms/admin/privacy-sections/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setSections((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/privacy-sections", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          heading: "New Section",
          body: "Section text here.",
          sort_order: sections.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setSections((prev) => [...prev, data.section]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((s, i) => ({ ...s, sort_order: i }));
    setSections(withOrders);
    await Promise.all(
      [withOrders[index], withOrders[target]].map((s) =>
        fetch(`/api/cms/admin/privacy-sections/${s.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            heading: s.heading,
            body: s.body,
            sort_order: s.sort_order,
            is_active: s.is_active,
          }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={section.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
          <div className="flex flex-col gap-1 pt-1">
            <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => handleMove(i, 1)} disabled={i === sections.length - 1} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Heading</label>
              <input type="text" value={section.heading} onChange={(e) => updateLocal(section.id, "heading", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea value={section.body} onChange={(e) => updateLocal(section.id, "body", e.target.value)} rows={5} className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input type="checkbox" checked={section.is_active} onChange={(e) => updateLocal(section.id, "is_active", e.target.checked)} />
              Active (visible on storefront)
            </label>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => handleSave(section)} disabled={savingId === section.id} className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50">
              {savingId === section.id ? "..." : "Save"}
            </button>
            <button onClick={() => handleDelete(section.id)} className="text-charcoal/40 hover:text-red-500 self-center">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleAdd} disabled={savingId === "new"} className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal transition-colors">
        <Plus size={16} /> Add Section
      </button>
    </div>
  );
}