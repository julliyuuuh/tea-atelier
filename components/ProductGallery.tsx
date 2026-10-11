"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_GALLERY_IMAGES } from "@/lib/product-input";

export default function ProductGalleryFields({
  images,
  files,
  onImagesChange,
  onFilesChange,
  disabled,
}: {
  images: string[];
  files: File[];
  onImagesChange: (images: string[]) => void;
  onFilesChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (images.length + files.length + selected.length > MAX_GALLERY_IMAGES) {
      setError(`Add at most ${MAX_GALLERY_IMAGES} extra images.`);
      return;
    }
    if (
      selected.some(
        (file) =>
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/gif",
          ].includes(file.type) || file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Choose JPG, PNG, WebP, AVIF or GIF images up to 5 MB each.");
      return;
    }
    setError("");
    onFilesChange([...files, ...selected]);
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-body text-xs text-charcoal/70">
          Extra images (optional)
        </p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={
            disabled || images.length + files.length >= MAX_GALLERY_IMAGES
          }
          className="flex cursor-pointer items-center gap-1 font-body text-xs text-sage disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> Add images
        </button>
      </div>
      <p className="font-body text-xs text-charcoal/50">
        Up to {MAX_GALLERY_IMAGES} extra images, 5 MB each. The main image stays
        on product cards.
      </p>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={choose}
        disabled={disabled}
        className="hidden"
        aria-label="Add extra product images"
      />
      {error && (
        <p role="alert" className="font-body text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {[...images, ...files].map((item, index) => (
          <div key={index} className="relative h-20 w-20">
            <img
              src={typeof item === "string" ? item : undefined}
              ref={
                typeof item === "string"
                  ? undefined
                  : (node) => {
                      if (!node) return;
                      const url = URL.createObjectURL(item);
                      node.src = url;
                      return () => URL.revokeObjectURL(url);
                    }
              }
              alt={`Extra image ${index + 1}`}
              className="h-full w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove extra image ${index + 1}`}
              onClick={() => {
                setError("");
                if (index < images.length)
                  onImagesChange(images.filter((_, i) => i !== index));
                else
                  onFilesChange(
                    files.filter((_, i) => i !== index - images.length),
                  );
              }}
              className="absolute right-1 top-1 cursor-pointer rounded-full bg-cream p-1 text-charcoal disabled:cursor-not-allowed"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
