"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Upload } from "lucide-react";

export default function CmsImageField({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
  variant = "cms",
  initials = "A",
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
  variant?: "cms" | "avatar";
  initials?: string;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => request.current?.abort(), []);

  async function upload(file: File) {
    if (uploading || disabled) return;
    setError("");
    if (
      !file.size ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Choose a JPG, PNG or WebP image up to 5 MB.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setUploading(true);
    onUploadingChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/cms/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body,
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(60000),
        ]),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string")
        throw new Error(data.error || "Unable to upload image.");
      if (!controller.signal.aborted) onChange(data.url);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Unable to upload image.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setUploading(false);
        onUploadingChange(false);
      }
    }
  }

  if (variant === "avatar")
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        {value ? (
          // Uploaded avatars use the existing Cloudinary image URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profile photo preview"
            className="h-20 w-20 shrink-0 rounded-full border border-charcoal/10 object-cover"
          />
        ) : (
          <span
            aria-label="No profile photo"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sage/15 font-display text-3xl text-sage"
          >
            {initials}
          </span>
        )}
        <div className="min-w-0 space-y-2">
          <p className="font-body text-sm font-medium text-charcoal">
            Profile photo
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
            <button
              type="button"
              disabled={disabled || uploading}
              aria-describedby={`${id}-help`}
              onClick={() => fileInput.current?.click()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-charcoal/20 px-4 py-2 text-xs text-charcoal hover:bg-sage/10 disabled:cursor-default disabled:opacity-40"
            >
              <Upload size={14} />
              {uploading
                ? "Uploading…"
                : value
                  ? "Change photo"
                  : "Upload photo"}
            </button>
            {value && (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => {
                  setError("");
                  onChange("");
                }}
                className="cursor-pointer text-xs text-charcoal/50 hover:text-red-700 disabled:opacity-40"
              >
                Remove photo
              </button>
            )}
          </div>
          <p id={`${id}-help`} className="text-xs text-charcoal/50">
            JPG, PNG or WebP · Up to 5 MB. Save your profile to apply.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-charcoal/70"
      >
        Image path or URL
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          setError("");
          onChange(event.target.value);
        }}
        disabled={disabled || uploading}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className="w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage disabled:opacity-50"
      />
      <div className="flex flex-wrap items-center gap-3">
        {value && (value.startsWith("/") || value.startsWith("https://")) && (
          // CMS images may use local paths or Cloudinary URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Current CMS image preview"
            loading="lazy"
            className="h-16 w-20 rounded border border-charcoal/10 object-cover"
          />
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInput.current?.click()}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-sage/40 px-3 py-2 text-sm text-sage hover:bg-sage/10 disabled:cursor-wait disabled:opacity-50"
        >
          <Upload size={16} />{" "}
          {uploading
            ? "Uploading..."
            : value
              ? "Replace image"
              : "Upload image"}
        </button>
      </div>
      <p id={`${id}-help`} className="text-xs text-charcoal/50">
        JPG, PNG or WebP, up to 5 MB. Upload, then save your changes.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
