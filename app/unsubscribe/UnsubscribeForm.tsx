"use client";
import { useState } from "react";
export default function UnsubscribeForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function unsubscribe() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to unsubscribe.");
      setDone(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to unsubscribe.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      {done ? (
        <p role="status" className="font-body text-sm text-sage">
          You are unsubscribed from promotional emails.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void unsubscribe()}
          disabled={busy || !token}
          className="rounded-full bg-charcoal px-6 py-3 font-body text-sm text-white hover:bg-sage disabled:opacity-50"
        >
          {busy ? "Unsubscribing…" : "Unsubscribe"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      {!token && (
        <p className="font-body text-sm text-charcoal/70">
          Open the unsubscribe link from one of your promotional emails.
        </p>
      )}
    </div>
  );
}
