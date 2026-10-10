"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import PhAddressFields, {
  EMPTY_PH_ADDRESS,
  isAddressComplete,
  toAddressPayload,
  type PhAddress,
} from "@/components/checkout/PhAddressFields";
import FormField from "./FormField";
import ConfirmDialog from "./ConfirmDialog";
import { AddressSkeleton } from "./Skeletons";

type Address = {
  address_id: number;
  address_label: string | null;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  barangay: string | null;
  default_address: boolean;
  default_billing: boolean;
  business_name: string | null;
  billing_contact: string | null;
  tax_id: string | null;
};
const buttonClass =
  "rounded-full border border-charcoal/20 px-4 py-2 font-body text-xs text-charcoal hover:bg-sand/30 disabled:opacity-50";
const formatAddress = (a: Address) =>
  [a.address_line1, a.address_line2, a.address_line3]
    .filter(Boolean)
    .join(", ");

async function request(path: string, method?: string, body?: unknown) {
  const token = localStorage.getItem("token");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unable to update addresses.");
  return data;
}

export default function SavedAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState<PhAddress>(EMPTY_PH_ADDRESS);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [line3, setLine3] = useState("");
  const [shipping, setShipping] = useState(false);
  const [billing, setBilling] = useState(false);
  const [label, setLabel] = useState("");
  const [business, setBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [taxId, setTaxId] = useState("");
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user?.email) return;
    request("/api/addresses")
      .then((data) => {
        if (active) {
          setAddresses(data.addresses);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.email, reload]);

  function openForm(address?: Address) {
    setEditing(address ?? null);
    setAdding(!address);
    setNewAddress(EMPTY_PH_ADDRESS);
    setLabel(address?.address_label ?? "");
    setLine1(address?.address_line1 ?? "");
    setLine2(address?.address_line2 ?? "");
    setLine3(address?.address_line3 ?? "");
    setShipping(address?.default_address ?? false);
    setBilling(address?.default_billing ?? false);
    setBusiness(!!(address?.business_name || address?.tax_id));
    setBusinessName(address?.business_name ?? "");
    setBillingContact(address?.billing_contact ?? "");
    setTaxId(address?.tax_id ?? "");
    setError(null);
    setNotice(null);
  }

  async function mutate(
    path: string,
    method: string,
    body: unknown,
    message: string,
    replaceId?: number,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await request(path, method, body);
      if (method === "DELETE") {
        setAddresses((prev) =>
          prev.filter((a) => a.address_id !== deleting?.address_id),
        );
        setDeleting(null);
      } else {
        const saved: Address = data.address;
        setAddresses((prev) => [
          ...prev
            .filter(
              (a) =>
                a.address_id !== replaceId && a.address_id !== saved.address_id,
            )
            .map((a) => ({
              ...a,
              default_address: saved.default_address
                ? false
                : a.default_address,
              default_billing: saved.default_billing
                ? false
                : a.default_billing,
            })),
          saved,
        ]);
        setAdding(false);
        setEditing(null);
      }
      setNotice(message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update addresses.",
      );
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (adding && !isAddressComplete(newAddress)) {
      setError("Complete the street, province, city and barangay fields.");
      return;
    }
    const body = {
      ...(editing
        ? {
            addressLine1: line1,
            addressLine2: line2,
            addressLine3: line3,
            barangay:
              line2 === (editing.address_line2 ?? "") ? editing.barangay : null,
          }
        : toAddressPayload(newAddress)),
      defaultAddress: shipping,
      defaultBilling: billing,
      addressLabel: label,
      businessName: business ? businessName : null,
      billingContact,
      taxId: business ? taxId : null,
    };
    void mutate(
      editing ? `/api/addresses/${editing.address_id}` : "/api/addresses",
      editing ? "PATCH" : "POST",
      body,
      "Address saved.",
      editing?.address_id,
    );
  }

  return (
    <section
      className="border-t border-charcoal/10 pt-8"
      aria-labelledby="saved-addresses-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="saved-addresses-heading"
          className="font-display text-xl text-charcoal"
        >
          Shipping &amp; Billing Addresses
        </h2>
        <button
          type="button"
          className={buttonClass}
          disabled={busy || loading || !!loadError || adding || !!editing}
          onClick={() => openForm()}
        >
          <Plus size={14} className="mr-1 inline" /> Add Address
        </button>
      </div>
      <p className="mb-6 font-body text-sm text-charcoal/60">
        Choose where orders are delivered and which address to use for billing.
        One address can serve both purposes.
      </p>
      {notice && (
        <p role="status" className="mb-4 font-body text-sm text-sage">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <AddressSkeleton />
      ) : loadError ? (
        <div role="alert" className="mb-4 font-body text-sm text-red-700">
          {loadError}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setLoading(true);
              setReload((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          {!addresses.length && (
            <p className="font-body text-sm text-charcoal/50">
              No saved addresses yet.
            </p>
          )}
          {addresses.map((address) => (
            <div key={address.address_id} className="rounded-xl bg-sand/30 p-5">
              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  className="mt-1 shrink-0 text-sage"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  {address.address_label && (
                    <p className="mb-1 font-body text-sm font-medium text-charcoal">
                      {address.address_label}
                    </p>
                  )}
                  {address.business_name && (
                    <p className="font-body text-sm font-medium text-charcoal">
                      {address.business_name}
                    </p>
                  )}
                  {address.billing_contact && (
                    <p className="font-body text-xs text-charcoal/60">
                      Billing contact: {address.billing_contact}
                    </p>
                  )}
                  <p className="break-words font-body text-sm text-charcoal">
                    {formatAddress(address)}
                  </p>
                  {address.tax_id && (
                    <p className="mt-1 font-body text-xs text-charcoal/60">
                      TIN: {address.tax_id}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 font-body text-xs text-sage">
                    {address.default_address && <span>Default shipping</span>}
                    {address.default_billing && <span>Default billing</span>}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || adding || !!editing}
                  aria-label={`Edit ${formatAddress(address)}`}
                  onClick={() => openForm(address)}
                  className="p-2 text-charcoal/60 disabled:opacity-50"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  disabled={busy || adding || !!editing}
                  aria-label={`Remove ${formatAddress(address)}`}
                  onClick={() => {
                    setError(null);
                    setDeleting(address);
                  }}
                  className="p-2 text-charcoal/60 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!address.default_address && (
                  <button
                    type="button"
                    disabled={busy || adding || !!editing}
                    className={buttonClass}
                    onClick={() =>
                      void mutate(
                        `/api/addresses/${address.address_id}`,
                        "PATCH",
                        { defaultAddress: true },
                        "Default shipping address updated.",
                        address.address_id,
                      )
                    }
                  >
                    Use for shipping
                  </button>
                )}
                {!address.default_billing && (
                  <button
                    type="button"
                    disabled={busy || adding || !!editing}
                    className={buttonClass}
                    onClick={() =>
                      void mutate(
                        `/api/addresses/${address.address_id}`,
                        "PATCH",
                        { defaultBilling: true },
                        "Default billing address updated.",
                        address.address_id,
                      )
                    }
                  >
                    Use for billing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {(adding || editing) && (
        <form
          onSubmit={save}
          className="space-y-5 rounded-xl border border-charcoal/15 p-5"
        >
          <h3 className="font-display text-lg">
            {editing ? "Edit Address" : "Add Address"}
          </h3>
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
            <FormField
              label="Address label (optional)"
              value={label}
              onChange={setLabel}
              maxLength={40}
              hint="For example: Home, Work, Warehouse or Main Branch."
            />
            <div
              className="flex flex-wrap gap-2"
              aria-label="Suggested address labels"
            >
              {["Home", "Work"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={buttonClass}
                  aria-pressed={label === suggestion}
                  onClick={() => setLabel(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            {editing ? (
              <>
                <FormField
                  label="Street / house / unit"
                  value={line1}
                  onChange={setLine1}
                  required
                  maxLength={255}
                />
                <FormField
                  label="Barangay, city and province"
                  value={line2}
                  onChange={setLine2}
                  maxLength={255}
                />
                <FormField
                  label="Additional address details"
                  value={line3}
                  onChange={setLine3}
                  maxLength={255}
                />
              </>
            ) : (
              <PhAddressFields
                key={adding ? "new" : "closed"}
                onChange={setNewAddress}
              />
            )}
            <div className="space-y-4 border-t border-charcoal/10 pt-5">
              <h4 className="font-body text-sm font-medium">Billing details</h4>
              <FormField
                label={
                  business
                    ? "Billing contact person (optional)"
                    : "Billing name (optional)"
                }
                value={billingContact}
                onChange={setBillingContact}
                maxLength={100}
              />
              <label className="flex items-center gap-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={business}
                  onChange={(e) => setBusiness(e.target.checked)}
                />{" "}
                Purchasing for a business
              </label>
              {business && (
                <>
                  <FormField
                    label="Business name"
                    value={businessName}
                    onChange={setBusinessName}
                    maxLength={200}
                    required
                  />
                  <FormField
                    label="TIN (optional)"
                    value={taxId}
                    onChange={setTaxId}
                    maxLength={32}
                    hint="9 digits, or 12 including the branch code. Hyphens and spaces are allowed."
                  />
                </>
              )}
              <p className="font-body text-xs text-charcoal/60">
                Mark this address for both shipping and billing below if they
                are the same.
              </p>
            </div>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={shipping}
                onChange={(e) => setShipping(e.target.checked)}
              />{" "}
              Default shipping address
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={billing}
                onChange={(e) => setBilling(e.target.checked)}
              />{" "}
              Default billing address
            </label>
          </fieldset>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className={`${buttonClass} bg-sage text-cream`}
            >
              {busy ? "Saving…" : "Save Address"}
            </button>
            <button
              type="button"
              disabled={busy}
              className={buttonClass}
              onClick={() => {
                setAdding(false);
                setEditing(null);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Remove this address?"
        description={deleting ? formatAddress(deleting) : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={() =>
          deleting &&
          void mutate(
            `/api/addresses/${deleting.address_id}`,
            "DELETE",
            undefined,
            "Address removed.",
          )
        }
        onCancel={() => {
          if (!busy) setDeleting(null);
        }}
      />
    </section>
  );
}
