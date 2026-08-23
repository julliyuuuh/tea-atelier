"use client";

// Shared skeleton pieces — all built from the same rounded-xl / bg-sand/30
// animate-pulse pattern that OrdersTab already used, so loading states look
// identical across all three tabs.

export function AddressSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-16 bg-sand/30 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 bg-sand/30 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export function SecurityPanelSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="h-28 bg-sand/30 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}