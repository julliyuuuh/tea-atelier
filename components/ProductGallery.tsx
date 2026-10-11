"use client";

import { useState } from "react";

const thumbnail = (url: string) =>
  url.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/,
    "$1c_fill,w_160,h_160,q_auto,f_auto/",
  );

export default function ProductGallery({
  image,
  galleryImages = [],
  name,
}: {
  image: string;
  galleryImages?: string[];
  name: string;
}) {
  const images = Array.from(new Set([image, ...galleryImages].filter(Boolean)));
  const [selected, setSelected] = useState(image);
  const current = images.includes(selected) ? selected : images[0];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-sand">
        <img src={current} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Product images"
        >
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(url)}
              aria-label={`View ${name} image ${index + 1}`}
              aria-pressed={current === url}
              className={`h-16 w-16 cursor-pointer overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 ${current === url ? "border-sage" : "border-transparent hover:border-sage/40"}`}
            >
              <img
                src={thumbnail(url)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
