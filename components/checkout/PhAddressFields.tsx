"use client";

import { useEffect, useState } from "react";

export type PsgcItem = {
  code: string;
  name: string;
  level: string; // "Prov" for provinces; anything else = a city at province level (HUC)
  reg: number;
  prv: number;
  mun: number;
};

export type PhAddress = {
  province: PsgcItem | null; // province, or the HUC itself (e.g. Quezon City)
  city: PsgcItem | null;
  barangay: PsgcItem | null;
  street: string;
};

const EMPTY: PhAddress = { province: null, city: null, barangay: null, street: "" };

export const isAddressComplete = (a: PhAddress) =>
  !!(a.province && a.city && a.barangay && a.street.trim());

// "Unit 4, Sampaguita St., Barangay X, City, Province" (HUCs don't repeat the city)
export function formatAddress(a: PhAddress) {
  return [
    a.street.trim(),
    a.barangay?.name,
    a.city?.name,
    a.province && a.province !== a.city ? a.province.name : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function useList(url: string | null) {
  const [items, setItems] = useState<PsgcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setItems([]);
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error("bad response");
        return r.json();
      })
      .then(setItems)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setItems([]);
        setError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [url]);

  return { items, loading, error };
}

const fieldClass =
  "w-full rounded-xl border border-charcoal/20 bg-cream px-4 py-3 font-body text-sm text-charcoal " +
  "outline-none focus:border-sage disabled:cursor-not-allowed disabled:bg-sand/30 disabled:text-charcoal/50";
const labelClass = "block font-body text-sm text-charcoal/70 mb-2";

function SelectField(props: {
  label: string;
  value: string;
  items: PsgcItem[];
  placeholder: string;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  onPick: (item: PsgcItem | null) => void;
}) {
  const { label, value, items, placeholder, loading, error, disabled, className = "block", onPick } = props;
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      <select
        required
        className={fieldClass}
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onPick(items.find((i) => i.code === e.target.value) ?? null)}
      >
        <option value="">{loading ? "Loading…" : placeholder}</option>
        {items.map((i) => (
          <option key={i.code} value={i.code}>
            {i.name}
          </option>
        ))}
      </select>
      {error && (
        <span className="mt-2 block font-body text-xs text-red-700">
          Couldn&apos;t load this list. Refresh the page and try again.
        </span>
      )}
    </label>
  );
}

export default function PhAddressFields({
  onChange,
}: {
  onChange: (address: PhAddress) => void;
}) {
  const [addr, setAddr] = useState<PhAddress>(EMPTY);

  function update(patch: Partial<PhAddress>) {
    const next = { ...addr, ...patch };
    setAddr(next);
    onChange(next);
  }

  const isHuc = !!addr.province && addr.province.level !== "Prov";

  const provinces = useList("/api/psgc/provinces");
  const cities = useList(
    addr.province && !isHuc
      ? `/api/psgc/cities?reg=${addr.province.reg}&prv=${addr.province.prv}`
      : null
  );
  const barangays = useList(
    addr.city
      ? `/api/psgc/barangays?reg=${addr.city.reg}&prv=${addr.city.prv}&mun=${addr.city.mun}`
      : null
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SelectField
        label="Province or city"
        value={addr.province?.code ?? ""}
        items={provinces.items}
        placeholder="Select province or city"
        loading={provinces.loading}
        error={provinces.error}
        onPick={(p) =>
          update({
            province: p,
            // a highly urbanized city is its own city, so there's nothing more to pick
            city: p && p.level !== "Prov" ? p : null,
            barangay: null,
          })
        }
      />

      <SelectField
        label="City or municipality"
        value={addr.city?.code ?? ""}
        items={isHuc && addr.province ? [addr.province] : cities.items}
        placeholder="Select city or municipality"
        loading={cities.loading}
        error={cities.error}
        disabled={!addr.province || isHuc}
        onPick={(c) => update({ city: c, barangay: null })}
      />

      <SelectField
        label="Barangay"
        className="block md:col-span-2"
        value={addr.barangay?.code ?? ""}
        items={barangays.items}
        placeholder="Select barangay"
        loading={barangays.loading}
        error={barangays.error}
        disabled={!addr.city}
        onPick={(b) => update({ barangay: b })}
      />

      <label className="block md:col-span-2">
        <span className={labelClass}>Street Address</span>
        <input
          type="text"
          required
          placeholder="House/unit number, street name, landmark"
          className={fieldClass}
          value={addr.street}
          maxLength={200}
          onChange={(e) => update({ street: e.target.value })}
        />
      </label>
    </div>
  );
}