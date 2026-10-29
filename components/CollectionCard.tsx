import Image from "next/image";
import Link from "next/link";
import { isOptimizableImage } from "@/lib/image-src";

export default function CollectionCard({
  href,
  name,
  tagline,
  image,
  imagePosition = "object-center",
  className = "h-64",
  sizes = "(min-width: 640px) 33vw, 100vw",
}: {
  href: string;
  name: string;
  tagline?: string;
  image: string;
  imagePosition?: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-2xl bg-sand ${className}`}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes}
        unoptimized={!isOptimizableImage(image)}
        className={`object-cover ${imagePosition} transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none`}
      />
      {/* charcoal turns light in dark mode, so the scrim behind the text is black */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/85" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
        <div>
          <h3 className="font-display text-2xl text-white">{name}</h3>
          {tagline && (
            <p className="mt-1 max-w-xs font-body text-sm leading-snug text-white/80">
              {tagline}
            </p>
          )}
        </div>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fdf6ed]/90 text-[#1f2621] transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
