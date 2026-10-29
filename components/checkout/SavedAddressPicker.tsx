"use client";

import { useEffect, useState } from "react";

export default function SavedAddressPicker({
  accountEmail,
  selectedId,
  onSelect,
  onReady,
}: {
  accountEmail: string | null;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onReady: (ready: boolean) => void;
}) {
  const [addresses, setAddresses] = useState<
    Array<{
      address_id: number;
      address_label: string | null;
      default_address: boolean;
      address_line1: string;
      address_line2: string | null;
      address_line3: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accountEmail) return;
    onReady(false);
    const controller = new AbortController();
    let active = true;
    fetch("/api/addresses", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Unable to load saved addresses.");
        if (active) {
          setAddresses(data.addresses);
          onSelect(
            data.addresses.find(
              (address: { default_address: boolean }) =>
                address.default_address,
            )?.address_id ?? null,
          );
          setError("");
        }
      })
      .catch((err) => {
        if (active && err.name !== "AbortError") {
          setError(
            "Could not load saved addresses. You can enter a new address below.",
          );
          onSelect(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          onReady(true);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [accountEmail, onSelect, onReady]);

  return (
    <div className="mb-6 space-y-3">
      {loading && (
        <p role="status" className="font-body text-sm text-charcoal/70">
          Loading saved addresses…
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-sm text-red-700">
          {error}
        </p>
      )}
      <fieldset className="space-y-3" disabled={loading}>
        <legend className="mb-3 font-body text-sm text-charcoal/70">
          Choose a delivery address
        </legend>
        {addresses.map((address) => (
          <label
            key={address.address_id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/20 p-4 has-[:checked]:border-sage"
          >
            <input
              type="radio"
              name="delivery-address"
              checked={selectedId === address.address_id}
              onChange={() => onSelect(address.address_id)}
              className="mt-1 accent-sage"
            />
            <span className="min-w-0 font-body text-sm text-charcoal">
              <span className="block font-medium">
                {address.address_label || "Saved address"}
                {address.default_address ? " · Default shipping" : ""}
              </span>
              <span className="block break-words text-charcoal/70">
                {[
                  address.address_line1,
                  address.address_line2,
                  address.address_line3,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </span>
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-charcoal/20 p-4">
          <input
            type="radio"
            name="delivery-address"
            checked={selectedId === null}
            onChange={() => onSelect(null)}
            className="accent-sage"
          />
          <span className="font-body text-sm">Enter a new address</span>
        </label>
      </fieldset>
    </div>
  );
}
