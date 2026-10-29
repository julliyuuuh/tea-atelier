"use client";
import { useStoreSettings } from "@/lib/store-settings-context";
export default function DisplayCurrencyPicker() {
  const { settings, currency, setCurrency } = useStoreSettings();
  if (!settings.usd.enabled) return null;
  return (
    <div className="mt-6 space-y-2 font-body">
      <p className="text-xs text-cream/60">Price display</p>
      <div
        className="inline-flex rounded-full border border-cream/30 p-1"
        role="group"
        aria-label="Display currency"
      >
        {(["PHP", "USD"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={currency === value}
            onClick={() => setCurrency(value)}
            className={`rounded-full px-4 py-1.5 text-xs transition ${currency === value ? "bg-cream text-charcoal" : "text-cream/70 hover:text-cream"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="text-xs text-cream/60">
        USD prices are estimates. Charged in PHP.
      </p>
    </div>
  );
}
