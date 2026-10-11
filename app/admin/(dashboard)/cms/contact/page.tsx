"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ValidatedForm from "@/components/ValidatedForm";
import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { ErrorBanner } from "@/components/admin/AdminUI";
import { SkeletonBlock } from "@/components/Skeleton";
import { CONTACT_FIELDS, type ContactContent } from "@/lib/contact-content";

type Document = { content: ContactContent; version: number };
const inputClass =
  "w-full rounded-xl border border-charcoal/20 bg-transparent px-3 py-2.5 font-body text-sm text-charcoal outline-none focus:border-sage";
const groups = [
  { title: "Page introduction", keys: ["eyebrow", "heading", "intro"] },
  { title: "Sign-in prompt", keys: ["loginHeading", "loginBody"] },
  { title: "Message confirmation", keys: ["successHeading", "successBody"] },
];
function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}
export default function AdminContactCmsPage() {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/cms/admin/contact-page", {
          headers: headers(),
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load Contact content.");
        if (!controller.signal.aborted) setDocument(data);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load Contact content.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  function update(key: keyof ContactContent, value: string) {
    setDocument((previous) =>
      previous
        ? { ...previous, content: { ...previous.content, [key]: value } }
        : previous,
    );
    setSaved(false);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/cms/admin/contact-page", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(document),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save Contact content.");
      setDocument(data);
      setSaved(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save Contact content.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AdminPage>
      <AdminPageHeader
        title="Contact page content"
        eyebrow="Content management"
        description="Update the page introduction, sign-in prompt, and message confirmation."
      />
      <div className="mb-5 flex flex-wrap gap-4 font-body text-sm">
        <Link href="/admin/cms" className="text-sage hover:underline">
          Back to content management
        </Link>
        <Link href="/contact" className="text-sage hover:underline">
          View Contact page
        </Link>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <SkeletonBlock className="h-64" />
      ) : (
        document && (
          <div className={adminFormSurface}>
            <ValidatedForm
              onSubmit={save}
              validateField={(field) =>
                field.required && !field.value.trim()
                  ? "Enter some text."
                  : null
              }
              className="max-w-3xl space-y-6"
            >
              <fieldset disabled={saving} className="space-y-6">
                {groups.map((group) => (
                  <section key={group.title} className="space-y-4">
                    <h2 className="font-body text-sm font-medium text-charcoal">
                      {group.title}
                    </h2>
                    {CONTACT_FIELDS.filter((field) =>
                      group.keys.includes(field.key),
                    ).map((field) => (
                      <div key={field.key}>
                        <label
                          htmlFor={`contact-${field.key}`}
                          className="mb-1.5 block font-body text-xs text-charcoal/60"
                        >
                          {field.label}
                        </label>
                        {"multiline" in field ? (
                          <textarea
                            id={`contact-${field.key}`}
                            name={field.key}
                            required
                            maxLength={field.max}
                            rows={3}
                            value={document.content[field.key]}
                            onChange={(event) =>
                              update(field.key, event.target.value)
                            }
                            className={inputClass}
                          />
                        ) : (
                          <input
                            id={`contact-${field.key}`}
                            name={field.key}
                            required
                            maxLength={field.max}
                            value={document.content[field.key]}
                            onChange={(event) =>
                              update(field.key, event.target.value)
                            }
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </section>
                ))}
                <p className="font-body text-xs text-charcoal/50">
                  Email, phone and address are managed in{" "}
                  <Link href="/admin/settings" className="text-sage underline">
                    Platform settings
                  </Link>
                  .
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="cursor-pointer rounded-full bg-sage px-5 py-2.5 font-body text-sm text-cream transition-colors hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  {saved && (
                    <span role="status" className="font-body text-sm text-sage">
                      Changes saved
                    </span>
                  )}
                </div>
              </fieldset>
            </ValidatedForm>
          </div>
        )
      )}
    </AdminPage>
  );
}
