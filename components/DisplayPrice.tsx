"use client";
import { useStoreSettings } from "@/lib/store-settings-context";
import { usdEstimate } from "@/lib/store-settings";
export default function DisplayPrice({ pesos }: { pesos: number }) {
  const { settings, currency } = useStoreSettings();
  const php = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(pesos);
  return currency === "USD" ? (
    <span title="Estimated USD price; charged in PHP">
      <span>≈ {usdEstimate(pesos, settings.usd.phpPerUsd)}</span>
      <span className="ml-2 text-xs opacity-60">{php}</span>
    </span>
  ) : (
    <span>{php}</span>
  );
}
