// app/admin/(dashboard)/cms/PromoTab.tsx
"use client";

import { useState, useEffect } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import { SkeletonBlock }  from "@/components/Skeleton";

interface PromoData {
  label: string;
  heading: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
}

const FIELDS: { key: keyof PromoData; label: string; multiline?: boolean }[] = [
  { key: "label", label: "Label" },
  { key: "heading", label: "Heading", multiline: true },
  { key: "image_url", label: "Image URL" },
  { key: "cta_text", label: "CTA Text" },
  { key: "cta_link", label: "CTA Link" },
];

export default function PromoTab() {
  const [form, setForm] = useState<PromoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cms/promo");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load promo.");
        setForm(data.promo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load promo.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function updateField(key: keyof PromoData, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cms/admin/promo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save promo.");
      setForm(data.promo);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save promo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <SkeletonBlock className="h-80" />;
  if (!form) return <ErrorBanner message={error ?? "Promo content not found."} />;

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