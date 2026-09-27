"use client";

import { useState, useEffect } from "react";
import { SkeletonBlock } from "@/components/Skeleton";

interface StoryData {
  eyebrow: string;
  heading: string;
  paragraph_1: string;
  paragraph_2: string;
  image_url: string;
}

const FIELDS: { key: keyof StoryData; label: string; multiline?: boolean }[] = [
  { key: "eyebrow", label: "Eyebrow" },
  { key: "heading", label: "Heading" },
  { key: "paragraph_1", label: "Paragraph 1", multiline: true },
  { key: "paragraph_2", label: "Paragraph 2", multiline: true },
  { key: "image_url", label: "Image URL" },
];

const inputClass =
  "w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass = "block text-sm font-medium text-charcoal/70 mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AboutStoryTab({ onError }: { onError: (msg: string) => void }) {
  const [form, setForm] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cms/about-story");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load story.");
        setForm(data.story);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Unable to load story.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(key: keyof StoryData, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/cms/admin/about-story", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save story.");
      setForm(data.story);
      setSaved(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to save story.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <SkeletonBlock className="h-96" />;
  if (!form) return null;

  return (
    <div className="max-w-2xl space-y-5">
      {FIELDS.map(({ key, label, multiline }) => (
        <div key={key}>
          <label className={labelClass}>{label}</label>
          {multiline ? (
            <textarea
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              rows={3}
              className={inputClass}
            />
          ) : (
            <input
              type="text"
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-sage text-cream text-sm px-5 py-2.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
        {saved && <span className="text-sm text-sage">Saved ✓</span>}
      </div>
    </div>
  );
}