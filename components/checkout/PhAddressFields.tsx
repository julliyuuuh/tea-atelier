"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

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

export const EMPTY_PH_ADDRESS: PhAddress = { province: null, city: null, barangay: null, street: "" };

export const isAddressComplete = (a: PhAddress) =>
  !!(a.province && a.city && a.barangay && a.street.trim());

// The strings the API stores. NCR cities sit at province level in PSGC, so
// they're saved with "Metro Manila" as the province.
export function toAddressPayload(a: PhAddress) {
  return {
    street: a.street.trim(),
    barangay: a.barangay?.name,
    city: a.city?.name,
    province:
      a.province && a.province.level !== "Prov" && a.province.reg === 13
        ? "Metro Manila"
        : a.province?.name,
  };
}

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

// "pinas" should find "Las Piñas"
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

// Custom dropdown styled like the admin CustomSelect. Lists with more than 8
// entries get a search box, since barangay lists can run past a thousand.
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
  const {
    label,
    value,
    items,
    placeholder,
    loading,
    error,
    disabled,
    className = "block",
    onPick,
  } = props;

  const uid = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.code === value) ?? null;
  const isDisabled = !!(disabled || loading);
  const searchable = items.length > 8;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? items.filter((i) => normalize(i.name).includes(q)) : items;
  }, [items, query]);

  function openMenu() {
    if (isDisabled) return;
    setQuery("");
    setActive(Math.max(0, items.findIndex((i) => i.code === value)));
    setOpen(true);
  }

  function choose(item: PsgcItem) {
    onPick(item);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // move focus to the search box when it exists
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  // keep the highlighted option in view while arrowing through a long list
  useEffect(() => {
    if (open) {
      document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, uid]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (isDisabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((a) => Math.min(a + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open) {
          e.preventDefault(); // don't submit the checkout form
          const item = filtered[active];
          if (item) choose(item);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className={className}>
      <span id={`${uid}-label`} className={labelClass}>
        {label}
      </span>

      <div ref={wrapRef} className="relative" onKeyDown={onKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${uid}-list`}
          aria-labelledby={`${uid}-label`}
          aria-activedescendant={open && filtered[active] ? `${uid}-opt-${active}` : undefined}
          disabled={isDisabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className={`${fieldClass} flex items-center justify-between gap-3 text-left`}
        >
          <span className={`truncate ${selected ? "" : "text-charcoal/40"}`}>
            {loading ? "Loading…" : selected?.name ?? placeholder}
          </span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-charcoal/50 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* invisible native input so the form's "required" check still fires */}
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          disabled={isDisabled}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-charcoal/10 bg-white p-2 shadow-lg"
            >
              {searchable && (
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Search…"
                  aria-label={`Search ${label}`}
                  className="mb-2 w-full rounded-full border border-charcoal/20 px-4 py-2 font-body text-sm text-charcoal outline-none focus:border-sage"
                />
              )}

              <ul
                id={`${uid}-list`}
                role="listbox"
                aria-labelledby={`${uid}-label`}
                className="max-h-64 overflow-y-auto"
              >
                {filtered.length === 0 && (
                  <li className="px-4 py-3 font-body text-sm text-charcoal/50">
                    No matches
                  </li>
                )}
                {filtered.map((item, i) => {
                  const isSelected = item.code === value;
                  return (
                    <li
                      key={item.code}
                      id={`${uid}-opt-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()} // keep focus where it is
                      onClick={() => choose(item)}
                      className={`cursor-pointer rounded-xl px-4 py-3 font-body text-sm ${
                        isSelected
                          ? "bg-charcoal/10 font-medium text-charcoal"
                          : i === active
                            ? "bg-sand/40 text-charcoal"
                            : "text-charcoal/80"
                      }`}
                    >
                      {item.name}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <span className="mt-2 block font-body text-xs text-red-700">
          Couldn&apos;t load this list. Refresh the page and try again.
        </span>
      )}
    </div>
  );
}

export default function PhAddressFields({
  onChange,
}: {
  onChange: (address: PhAddress) => void;
}) {
  const [addr, setAddr] = useState<PhAddress>(EMPTY_PH_ADDRESS);

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