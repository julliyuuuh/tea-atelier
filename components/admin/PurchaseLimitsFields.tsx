"use client";
import Link from "next/link";
import { useBusiness } from "@/lib/business-context";
import { php } from "@/lib/purchase-limits";
export default function BusinessPurchaseBanner() {
  const { approved, application, limits, ready } = useBusiness();
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sage/20 bg-sage/5 px-4 py-3 text-xs">
      <p className="text-charcoal/60">
        {approved && ready
          ? `Business purchasing enabled · Up to ${limits.business.perProduct} per product and ${limits.business.totalUnits} units per order (${php(limits.business.totalCents)}).`
          : application?.status === "PENDING"
            ? "Your bulk purchasing application is under review."
            : "Buying in bulk? Apply for higher purchase limits."}
      </p>
      <Link
        href="/account?tab=settings&section=business"
        className="text-sage underline"
      >
        {approved ? "View your limits" : "Business purchasing"}
      </Link>
    </div>
  );
}
