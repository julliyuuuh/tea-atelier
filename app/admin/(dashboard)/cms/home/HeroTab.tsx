// app/admin/(dashboard)/cms/home/HeroTab.tsx
"use client";

import { useState, useEffect } from "react";
import { SkeletonBlock } from "@/components/Skeleton";

interface HeroData {
  volume_label: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  image_caption: string;
}

const FIELDS: { key: keyof HeroData; label: string; multiline?: boolean }[] = [
  { key: "volume_label", label: "Volume Label" },
  { key: "eyebrow", label: "Eyebrow" },
  { key: "heading", label: "Heading", multiline: true },
  { key: "subheading", label: "Subheading", multiline: true },
  { key: "cta_text", label: "CTA Text" },
  { key: "cta_link", label: "CTA Link" },
  { key: "image_url", label: "Image URL" },
  { key: "image_caption", label: "Image Caption" },
];

const inputClass =
  "w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass = "block text-sm font-medium text-charcoal/70 mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function HeroTab({ onError }: { onError: (msg: string) => void }) {
  const [form, setForm] = useState<HeroData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cms/hero");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load hero.");
        setForm(data.hero);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Unable to load hero.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(key: keyof HeroData, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/cms/admin/hero", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save hero.");
      setForm(data.hero);
      setSaved(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to save hero.");
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