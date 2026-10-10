"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ProductReviewData } from "@/lib/product-reviews";
export default function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductReviewData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/products/${productId}/reviews?page=${page}`,
          {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.error || "Unable to load reviews.");
        if (!controller.signal.aborted) setData(json);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to load reviews.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [productId, page, reload]);
  return (
    <section aria-labelledby="product-reviews-heading" className="space-y-6">
      <div>
        <h2
          id="product-reviews-heading"
          className="font-display text-2xl text-charcoal"
        >
          Ratings & reviews
        </h2>
        <p className="mt-2 font-body text-xs text-charcoal/60">
          Purchased this tea?{" "}
          <Link
            href="/account"
            className="text-sage underline underline-offset-4"
          >
            Write a review from My Orders.
          </Link>
        </p>
      </div>
      {loading ? (
        <p className="font-body text-sm text-charcoal/60">Loading reviews…</p>
      ) : error ? (
        <div role="alert" className="font-body text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="ml-3 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        data && (
          <>
            {data.summary.total === 0 ? (
              <div className="rounded-2xl border border-dashed border-charcoal/15 p-8 text-center">
                <MessageSquare
                  className="mx-auto mb-3 text-sage"
                  size={24}
                  aria-hidden="true"
                />
                <p className="font-body text-sm text-charcoal/60">
                  No reviews yet. Be the first to share your experience.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="font-display text-4xl text-charcoal">
                    {data.summary.average.toFixed(1)}
                  </span>
                  <div>
                    <ReviewStars rating={data.summary.average} />
                    <p className="mt-1 font-body text-xs text-charcoal/50">
                      Based on {data.summary.total} verified{" "}
                      {data.summary.total === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.summary.distribution.map((row) => (
                    <div
                      key={row.rating}
                      className="flex items-center gap-3 font-body text-xs text-charcoal/60"
                    >
                      <span className="w-10">{row.rating} star</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand/60">
                        <div
                          className="h-full rounded-full bg-sage"
                          style={{
                            width: `${(row.count / data.summary.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right">{row.count}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-5">
                  {data.reviews.map((review) => (
                    <article
                      key={review.review_id}
                      className="space-y-3 border-b border-charcoal/10 pb-5 last:border-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-body text-sm font-medium text-charcoal">
                          {review.author}
                        </span>
                        <ReviewStars rating={review.rating} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-body text-xs text-charcoal/50">
                        <span className="inline-flex items-center gap-1 text-sage">
                          <BadgeCheck size={13} aria-hidden="true" />
                          Verified purchase
                        </span>
                        <time dateTime={review.created_at}>
                          {new Date(review.created_at).toLocaleDateString(
                            "en-PH",
                            {
                              timeZone: "Asia/Manila",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </time>
                        {review.updated_at !== review.created_at && (
                          <span>Edited</span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-charcoal/70">
                        {review.body}
                      </p>
                    </article>
                  ))}
                </div>
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between font-body text-xs">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((value) => value - 1)}
                      className="rounded-full border border-charcoal/15 px-4 py-2 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {data.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((value) => value + 1)}
                      className="rounded-full border border-charcoal/15 px-4 py-2 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )
      )}
    </section>
  );
}
