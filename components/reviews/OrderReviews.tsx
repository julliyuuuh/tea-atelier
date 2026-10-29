"use client";
import ValidatedForm from "@/components/ValidatedForm";
import { useEffect, useState } from "react";
import { Check, Pencil, Star } from "lucide-react";
import {
  ReviewRatingInput,
  ReviewStars,
} from "@/components/reviews/ReviewStars";
import type { OwnReview, ReviewItem } from "@/lib/product-reviews";
function ReviewEditor({
  item,
  orderId,
  onSaved,
}: {
  item: ReviewItem;
  orderId: number;
  onSaved: (review: OwnReview) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(item.review?.rating ?? 0);
  const [body, setBody] = useState(item.review?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/reviews`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ productId: item.productId, rating, body }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save review.");
      onSaved(data.review);
      setSaved(true);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save review.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="space-y-3 rounded-xl border border-charcoal/10 bg-cream/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-body text-sm font-medium">{item.name}</h4>
          {item.review && (
            <div className="mt-1">
              <ReviewStars rating={item.review.rating} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setSaved(false);
          }}
          disabled={busy}
          aria-expanded={open}
          aria-controls={`review-editor-${item.productId}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 px-3 py-2 font-body text-xs text-sage transition hover:bg-sage/10 disabled:opacity-50"
        >
          <Pencil size={13} aria-hidden="true" />
          {open ? "Close" : item.review ? "Edit review" : "Write a review"}
        </button>
      </div>
      {saved && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 font-body text-xs text-sage"
        >
          <Check size={14} aria-hidden="true" />
          Review saved. Thank you!
        </p>
      )}
      {!open && item.review && (
        <p className="whitespace-pre-wrap break-words font-body text-sm text-charcoal/70">
          {item.review.body}
        </p>
      )}
      <div id={`review-editor-${item.productId}`} hidden={!open}>
        {open && (
          <ValidatedForm
            onSubmit={submit}
            className="space-y-4 border-t border-charcoal/10 pt-4"
          >
            <ReviewRatingInput
              value={rating}
              onChange={setRating}
              disabled={busy}
            />
            <label className="block space-y-2 font-body text-sm">
              Your review
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={busy}
                placeholder="How was the quality, flavour, or your experience?"
                className="w-full rounded-xl border border-charcoal/15 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-sage/40 disabled:opacity-50"
              />
            </label>
            <p className="font-body text-xs text-charcoal/70">
              10–2,000 characters. Your first name and last initial will appear
              publicly.
            </p>
            {error && (
              <p role="alert" className="font-body text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-sage px-5 py-2.5 font-body text-sm text-white transition hover:bg-sage/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save review"}
            </button>
          </ValidatedForm>
        )}
      </div>
    </article>
  );
}
export default function OrderReviews({ orderId }: { orderId: number }) {
  const [data, setData] = useState<{
    eligible: boolean;
    items: ReviewItem[];
  } | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/orders/${orderId}/reviews`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.error || "Unable to load your reviews.");
        if (!controller.signal.aborted) {
          setData(json);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load your reviews.",
          );
      }
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [orderId, reload]);
  return (
    <section className="space-y-4 rounded-2xl border border-charcoal/10 bg-sand/30 p-5 sm:p-6">
      <h3 className="flex items-center gap-2 font-display text-lg">
        <Star size={18} className="text-sage" aria-hidden="true" />
        Review your products
      </h3>
      {error ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="ml-2 underline"
          >
            Try again
          </button>
        </p>
      ) : !data ? (
        <p className="font-body text-sm text-charcoal/70">
          Loading your reviews…
        </p>
      ) : !data.eligible ? (
        <p className="font-body text-sm text-charcoal/70">
          Reviews are available once your order is delivered and payment is
          recorded.
        </p>
      ) : (
        <>
          <p className="font-body text-xs text-charcoal/70">
            Share your experience with other tea lovers. One review per product;
            you can edit it later.
          </p>
          {data.items.map((item) => (
            <ReviewEditor
              key={item.productId}
              item={item}
              orderId={orderId}
              onSaved={(review) =>
                setData((current) =>
                  current
                    ? {
                        ...current,
                        items: current.items.map((row) =>
                          row.productId === item.productId
                            ? { ...row, review }
                            : row,
                        ),
                      }
                    : current,
                )
              }
            />
          ))}
        </>
      )}
    </section>
  );
}
