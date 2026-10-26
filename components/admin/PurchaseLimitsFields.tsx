"use client";
import type { PurchaseLimits } from "@/lib/purchase-limits";
export default function PurchaseLimitsFields({
  value,
  onChange,
}: {
  value: PurchaseLimits;
  onChange: (value: PurchaseLimits) => void;
}) {
  const input =
    "mt-1 block w-full rounded-xl border border-charcoal/20 bg-transparent px-3 py-2 text-sm";
  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-7">
      <h2 className="font-display text-2xl">Purchase limits</h2>
      <p className="mt-2 text-sm text-charcoal/50">
        Limits apply to selected items and include delivery fees. Approved
        businesses retain customer access.
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {(["standard", "business"] as const).map((tier) => (
          <div key={tier} className="rounded-xl border border-charcoal/10 p-4">
            <h3 className="mb-3 text-sm font-medium">
              {tier === "standard"
                ? "Standard customers"
                : "Approved businesses"}
            </h3>
            {[
              ["perProduct", "Units per product", 1],
              ["totalUnits", "Units per checkout", 1],
              ["totalCents", "Maximum order total (PHP)", 100],
            ].map(([key, label, scale]) => (
              <label key={key} className="mt-3 block text-xs text-charcoal/60">
                {label}
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={
                    value[tier][key as keyof typeof value.standard] /
                      Number(scale) || ""
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [tier]: {
                        ...value[tier],
                        [key]: Math.round(
                          Number(e.target.value) * Number(scale),
                        ),
                      },
                    })
                  }
                  className={input}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
      <label className="mt-4 block max-w-sm text-xs text-charcoal/60">
        COD maximum, including delivery (PHP)
        <input
          type="number"
          min="1"
          step="1"
          required
          value={value.codCents / 100 || ""}
          onChange={(e) =>
            onChange({
              ...value,
              codCents: Math.round(Number(e.target.value) * 100),
            })
          }
          className={input}
        />
      </label>
    </section>
  );
}
