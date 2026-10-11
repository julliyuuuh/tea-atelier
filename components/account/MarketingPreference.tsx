"use client";
import { useEffect, useState } from "react";
export default function MarketingPreference() {
  const [subscribed, setSubscribed] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
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
        setSubscribed(data.subscribed);
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
  }, []);
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
        value
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
      className="rounded-2xl p-6 bg-sand/25 border border-charcoal/5"
      aria-busy={loading || saving}
    >
      <h3 className="font-display text-lg text-charcoal mb-2">
        Promotional emails
      </h3>
      <p className="font-body text-sm text-charcoal/60 mb-4">
        Choose whether to receive offers, new arrivals, and tea updates. Order
        and account emails stay enabled either way.
      </p>
      <label className="flex items-start gap-3 font-body text-sm text-charcoal">
        <input
          type="checkbox"
          checked={subscribed}
          disabled={loading || saving}
          onChange={(event) => void change(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-sage"
        />
        <span>
          {loading
            ? "Loading your preference…"
            : "Send me Tea Atelier promotional emails"}
        </span>
      </label>
      {notice && (
        <p role="status" className="mt-3 font-body text-sm text-sage">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
