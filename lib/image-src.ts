// next/image throws for hosts that aren't listed in next.config.ts, and CMS
// image fields accept any URL. Only local files and Cloudinary uploads are
// optimized; anything else is passed through with `unoptimized` instead.
export function isOptimizableImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return !src.includes("?");
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      !url.port &&
      !url.search
    );
  } catch {
    return false;
  }
}
