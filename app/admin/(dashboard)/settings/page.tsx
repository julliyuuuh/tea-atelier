"use client";
import PurchaseLimitsFields from "@/components/admin/PurchaseLimitsFields";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import ValidatedForm from "@/components/ValidatedForm";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Save,
  Truck,
  Building2,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import {
  PAYMENT_OPTIONS,
  SHIPPING_OPTIONS,
  validateSettings,
  type SettingsDocument,
  type StoreSettings,
} from "@/lib/store-settings";
const input =
  "mt-2 w-full rounded-xl border border-charcoal/15 bg-white px-4 py-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/15";
const moneyText = (cents: number) => (cents / 100).toFixed(2);
function amount(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a PHP amount with at most two decimals.");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export default function StoreSettingsPage() {
  const { user, isLoading } = useAuth();
  const { refresh } = useStoreSettings();
  const [reloadOpen, setReloadOpen] = useState(false);
  const [saved, setSaved] = useState<SettingsDocument | null>(null);
  const [draft, setDraft] = useState<StoreSettings | null>(null);
  const [fees, setFees] = useState({ standard: "", express: "" });
  const [threshold, setThreshold] = useState("");
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  function apply(data: SettingsDocument) {
    setSaved(data);
    setDraft(data.config);
    setFees({
      standard: moneyText(data.config.shipping.standard.feeCents),
      express: moneyText(data.config.shipping.express.feeCents),
    });
    setThreshold(
      data.config.freeShippingThresholdCents === null
        ? ""
        : moneyText(data.config.freeShippingThresholdCents),
    );
    setRate(String(data.config.usd.phpPerUsd));
  }
  const load = useCallback(async () => {
    if (user?.role !== "super_admin") return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load settings.");
      apply(data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.role]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !saved || saving) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const config = validateSettings({
        ...draft,
        shipping: {
          standard: {
            ...draft.shipping.standard,
            feeCents: amount(fees.standard),
          },
          express: {
            ...draft.shipping.express,
            feeCents: amount(fees.express),
          },
        },
        freeShippingThresholdCents: threshold.trim() ? amount(threshold) : null,
        usd: { ...draft.usd, phpPerUsd: Number(rate) },
      });
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ config, version: saved.version }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save settings.");
      apply(data);
      setNotice("Settings saved.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save settings. Reload to check the saved version before retrying.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (isLoading)
    return <p className="p-8 font-body text-sm text-charcoal/60">Loading…</p>;
  if (user?.role !== "super_admin")
    return (
      <p className="p-8 font-body text-sm text-charcoal/60">
        Store settings are available to super admins.
      </p>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-body text-xs uppercase tracking-widest text-charcoal/50">
              Super admin
            </p>
            <h1 className="mt-2 font-display text-4xl text-charcoal">
              Settings & configuration
            </h1>
          </div>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => {
              if (draft) setReloadOpen(true);
              else void load();
            }}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-charcoal/15 px-4 py-2.5 font-body text-sm text-sage transition-colors hover:bg-sage/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Reload settings
          </button>
        </div>
        <p className="mt-3 font-body text-sm text-charcoal/60">
          Manage delivery, payment options, and store details. Existing orders
          keep their recorded fees and payment methods.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-sage/10 p-4 font-body text-sm text-sage"
        >
          <Check size={16} />
          {notice}
        </p>
      )}
      {loading ? (
        <p className="font-body text-sm text-charcoal/50">Loading settings…</p>
      ) : (
        draft && (
          <ValidatedForm
            onSubmit={save}
            className="space-y-6 font-body text-charcoal"
          >
            <fieldset
              disabled={saving}
              className="space-y-6 disabled:opacity-70"
            >
              <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-7">
                <h2 className="flex items-center gap-3 font-display text-2xl">
                  <Building2 size={20} className="text-sage" />
                  Store details
                </h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Store name"],
                      ["email", "Contact email"],
                      ["phone", "Contact phone"],
                      ["address", "Business address"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-sm text-charcoal/60">
                      {label}
                      <input
                        required={key === "name"}
                        type={key === "email" ? "email" : "text"}
                        maxLength={
                          key === "address"
                            ? 500
                            : key === "phone"
                              ? 40
                              : key === "name"
                                ? 100
                                : 200
                        }
                        value={draft.store[key]}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            store: {
                              ...draft.store,
                              [key]: event.target.value,
                            },
                          })
                        }
                        className={input}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-4 text-xs text-charcoal/50">
                  These details appear in the storefront footer.
                </p>
              </section>
              <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-7">
                <h2 className="flex items-center gap-3 font-display text-2xl">
                  <Truck size={20} className="text-sage" />
                  Shipping options
                </h2>
                <div className="mt-5 space-y-4">
                  {(
                    Object.keys(
                      SHIPPING_OPTIONS,
                    ) as (keyof typeof SHIPPING_OPTIONS)[]
                  ).map((key) => (
                    <div
                      key={key}
                      className="rounded-xl border border-charcoal/10 bg-sand/20 p-4"
                    >
                      <label className="flex items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={draft.shipping[key].enabled}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              shipping: {
                                ...draft.shipping,
                                [key]: {
                                  ...draft.shipping[key],
                                  enabled: event.target.checked,
                                },
                              },
                            })
                          }
                          className="h-4 w-4 accent-sage"
                        />
                        {SHIPPING_OPTIONS[key]}
                      </label>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="text-xs text-charcoal/60">
                          Fee (PHP)
                          <input
                            inputMode="decimal"
                            value={fees[key]}
                            onChange={(event) =>
                              setFees({ ...fees, [key]: event.target.value })
                            }
                            className={input}
                          />
                        </label>
                        <label className="text-xs text-charcoal/60">
                          Delivery estimate
                          <input
                            maxLength={100}
                            value={draft.shipping[key].estimate}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                shipping: {
                                  ...draft.shipping,
                                  [key]: {
                                    ...draft.shipping[key],
                                    estimate: event.target.value,
                                  },
                                },
                              })
                            }
                            className={input}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <label className="mt-5 block text-sm text-charcoal/60">
                  Free shipping on orders of at least (PHP)
                  <input
                    inputMode="decimal"
                    placeholder="Leave blank to disable"
                    value={threshold}
                    onChange={(event) => setThreshold(event.target.value)}
                    className={input}
                  />
                </label>
                <p className="mt-2 text-xs text-charcoal/50">
                  Based on the product subtotal. Applies to all enabled delivery
                  methods.
                </p>
              </section>
              <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-7">
                <h2 className="flex items-center gap-3 font-display text-2xl">
                  <CreditCard size={20} className="text-sage" />
                  Payment options
                </h2>
                <p className="mt-3 text-sm text-charcoal/50">
                  Choose what customers can select for new orders. Existing
                  payments and refunds continue through their original method.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {(
                    Object.keys(
                      PAYMENT_OPTIONS,
                    ) as (keyof typeof PAYMENT_OPTIONS)[]
                  ).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 rounded-xl border border-charcoal/10 p-4 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={draft.payments[key]}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            payments: {
                              ...draft.payments,
                              [key]: event.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 accent-sage"
                      />
                      {PAYMENT_OPTIONS[key]}
                    </label>
                  ))}
                </div>
              </section>
              <PurchaseLimitsFields
                value={draft.purchaseLimits}
                onChange={(purchaseLimits) =>
                  setDraft({ ...draft, purchaseLimits })
                }
              />
              <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-7">
                <h2 className="flex items-center gap-3 font-display text-2xl">
                  <DollarSign size={20} className="text-sage" />
                  Optional USD display
                </h2>
                <label className="mt-5 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.usd.enabled}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        usd: { ...draft.usd, enabled: event.target.checked },
                      })
                    }
                    className="h-4 w-4 accent-sage"
                  />
                  Let customers view estimated USD prices
                </label>
                <label className="mt-5 block text-sm text-charcoal/60">
                  PHP per US$1
                  <input
                    inputMode="decimal"
                    value={rate}
                    onChange={(event) => setRate(event.target.value)}
                    className={input}
                  />
                </label>
                <p className="mt-3 text-xs leading-relaxed text-charcoal/50">
                  Manually maintained rate, used only for display. Customers
                  choose PHP or USD in the footer. Product prices, checkout
                  charges, invoices, and refunds remain in PHP.
                </p>
              </section>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-charcoal/50">
                Changes are recorded in the audit trail.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-sm text-white transition hover:bg-charcoal disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </ValidatedForm>
        )
      )}
      <ConfirmDialog
        open={reloadOpen}
        title="Reload settings?"
        description="Any unsaved edits will be discarded and the latest saved settings will be loaded."
        confirmLabel="Reload settings"
        cancelLabel="Keep editing"
        onCancel={() => setReloadOpen(false)}
        onConfirm={() => {
          if (loading || saving) return;
          setReloadOpen(false);
          void load();
        }}
      />
    </div>
  );
}
