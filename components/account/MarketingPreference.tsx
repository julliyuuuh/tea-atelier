"use client";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
export default function MarketingPreference({
  verified = true,
}: { verified?: boolean } = {}) {
  const [subscribed, setSubscribed] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/marketing/preferences", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load email preferences.");
        if (!controller.signal.aborted) {
          setSubscribed(data.subscribed);
          setLoaded(true);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load email preferences.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);
  async function change(value: boolean) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/marketing/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ subscribed: value }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save email preference.");
      setSubscribed(data.subscribed);
      setNotice(
        data.subscribed
          ? "You are subscribed to promotional emails."
          : "Promotional emails are disabled.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save email preference.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="min-w-0 rounded-2xl border border-charcoal/5 bg-sand/25 p-5 sm:p-6"
      aria-busy={loading || saving}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
          <Mail size={18} aria-hidden="true" />
        </span>
        <h3 className="font-display text-lg text-charcoal">
          Email preferences
        </h3>
      </div>
      <label
        className="flex items-start justify-between gap-4"
        htmlFor="settings-promotional-email"
      >
        <span className="min-w-0 font-body">
          <span
            id="settings-promotional-email-label"
            className="block text-sm font-medium text-charcoal"
          >
            Offers & tea updates
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-charcoal/60">
            Choose whether to receive new arrivals, offers and tea inspiration.
          </span>
        </span>
        <span className="relative mt-1 flex h-6 w-11 shrink-0">
          <input
            id="settings-promotional-email"
            type="checkbox"
            role="switch"
            aria-labelledby="settings-promotional-email-label"
            checked={subscribed}
            disabled={
              !loaded || loading || saving || (!verified && !subscribed)
            }
            onChange={(event) => void change(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 cursor-pointer rounded-full bg-charcoal/15 transition-colors peer-checked:bg-sage peer-focus-visible:outline-2 peer-focus-visible:outline-sage peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 motion-reduce:transition-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5 peer-disabled:opacity-70 motion-reduce:transition-none"
          />
        </span>
      </label>
      <p role="status" className="mt-3 font-body text-[11px] text-charcoal/50">
        {loading
          ? "Loading your preference..."
          : saving
            ? "Saving your preference..."
            : !loaded
              ? "Preference unavailable"
              : subscribed
                ? "Subscribed to promotional emails"
                : "Promotional emails are off"}
      </p>
      {!verified && !subscribed && (
        <p className="mt-2 font-body text-xs text-amber-800">
          Verify your email before subscribing to offers.
        </p>
      )}
      <div className="mt-4 border-t border-charcoal/10 pt-3 font-body">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-charcoal/70">
            Order & account emails
          </span>
          <span className="rounded-full bg-sage/10 px-2.5 py-1 text-[10px] text-sage">
            Always enabled
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-charcoal/50">
          Payment confirmations, order updates and security emails stay enabled.
          You can unsubscribe from offers at any time.
        </p>
      </div>
      {notice && (
        <p role="status" className="mt-3 font-body text-xs text-sage">
          {notice}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <p role="alert" className="font-body text-xs text-red-700">
            {error}
          </p>
          {!loaded && (
            <button
              type="button"
              disabled={loading}
              className="mt-2 cursor-pointer font-body text-xs text-sage underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                setLoading(true);
                setRefresh((value) => value + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
