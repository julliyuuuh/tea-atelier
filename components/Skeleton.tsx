/**
 * Reusable pulsing placeholder block for loading states.
 * Matches the bg-sand/30 animate-pulse rounded-xl pattern already
 * established in OrdersTab so skeletons look the same everywhere.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-sand/30 animate-pulse rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}