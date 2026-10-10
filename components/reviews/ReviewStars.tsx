"use client";
import { useId } from "react";
import { Star } from "lucide-react";
export function ReviewStars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex gap-0.5 text-sage"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={15}
          aria-hidden="true"
          className={
            value <= Math.round(rating) ? "fill-current" : "text-charcoal/20"
          }
        />
      ))}
    </span>
  );
}
export function ReviewRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 font-body text-sm">Your rating</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="relative cursor-pointer">
            <input
              type="radio"
              name={id}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
              className="peer sr-only"
              required
            />
            <span className="block rounded-lg p-1.5 text-sage peer-focus-visible:ring-2 peer-focus-visible:ring-sage/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              <Star
                size={26}
                aria-hidden="true"
                className={
                  rating <= value ? "fill-current" : "text-charcoal/25"
                }
              />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
