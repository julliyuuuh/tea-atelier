// app/admin/(dashboard)/cms/HeroTab.tsx
"use client";

import { useState, useEffect } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import {SkeletonBlock} from "@/components/Skeleton";

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

export default function HeroTab() {
  const [form, setForm] = useState<HeroData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cms/hero");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load hero.");
        setForm(data.hero);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load hero.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function updateField(key: keyof HeroData, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cms/admin/hero", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save hero.");
      setForm(data.hero);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save hero.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <SkeletonBlock className="h-96" />;
  if (!form) return <ErrorBanner message={error ?? "Hero content not found."} />;

  return (
    <div className="max-w-2xl space-y-5">
      {error && <ErrorBanner message={error} />}

      {FIELDS.map(({ key, label, multiline }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">
            {label}
          </label>
          {multiline ? (
            <textarea
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              rows={3}
              className="w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage"
            />
          ) : (
            <input
              type="text"
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage"
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