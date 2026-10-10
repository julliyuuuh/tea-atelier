"use client";

import { useCallback, useEffect, useState } from "react";
import { RETURN_REASONS, peso, type ReturnCase } from "@/lib/returns";
type Data = {
  request: ReturnCase | null;
  canReturn: boolean;
  canRefund: boolean;
};
export default function OrderReturnPanel({ orderId }: { orderId: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("RETURN");
  const [reason, setReason] = useState("damaged");
  const [details, setDetails] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/orders/${orderId}/returns`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        });
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.error || "Unable to load requests.");
        if (!signal?.aborted) {
          setData(json);
          setError("");
          setKind(json.canReturn ? "RETURN" : "REFUND");
        }
      } catch (cause) {
        if (!signal?.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to load requests.",
          );
      }
    },
    [orderId],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ kind, reason, details }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error || "Unable to submit request.");
      setData(json);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit request.",
      );
    } finally {
      setBusy(false);
    }
  }
  const request = data?.request;
  const field =
    "w-full rounded-lg border border-charcoal/15 bg-cream p-2 font-body text-sm text-charcoal";
  return (
    <section className="space-y-4 rounded-xl bg-sand/30 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base text-charcoal">
          Returns & refunds
        </h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="font-body text-xs text-sage hover:underline"
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="font-body text-sm text-red-600">
          {error}
        </p>
      )}
      {!data && !error && (
        <p className="font-body text-sm text-charcoal/60">
          Loading request details…
        </p>
      )}
      {request ? (
        <div className="space-y-2 font-body text-sm text-charcoal/80">
          <p>
            <strong>
              {request.kind === "RETURN" ? "Return" : "Refund"} request:{" "}
              {request.status.replaceAll("_", " ").toLowerCase()}
            </strong>
          </p>
          <p>{RETURN_REASONS[request.reason]}</p>
          <p className="whitespace-pre-wrap break-words">{request.details}</p>
          {request.customer_message && (
            <p className="whitespace-pre-wrap rounded-lg border border-charcoal/10 p-3">
              {request.customer_message}
            </p>
          )}
          {request.refund_amount_cents > 0 && (
            <p>Approved refund: {peso(request.refund_amount_cents)}</p>
          )}
          {request.refund_state && (
            <p>
              Refund: {request.refund_state.toLowerCase()}
              {request.refund_is_test ? " · Test mode" : ""}
            </p>
          )}
          {request.refund_state === "UNKNOWN" && (
            <p>
              We are verifying the payment provider’s response. Please contact
              us if you need an update.
            </p>
          )}
          {request.status === "REJECTED" && (
            <p>Contact support if you need this decision reviewed.</p>
          )}
        </div>
      ) : data && (data.canReturn || data.canRefund) ? (
        <form onSubmit={submit} className="space-y-4">
          <p className="font-body text-sm text-charcoal/60">
            Submit one request for this order. Our team will review the items
            and refund amount before approval. Please describe the affected
            items. Do not include banking details.
          </p>
          <label className="block space-y-1 font-body text-sm">
            Request type
            <select
              className={field}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={busy}
            >
              {data.canReturn && <option value="RETURN">Return items</option>}
              {data.canRefund && (
                <option value="REFUND">Refund without a return</option>
              )}
            </select>
          </label>
          <label className="block space-y-1 font-body text-sm">
            Reason
            <select
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            >
              {Object.entries(RETURN_REASONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 font-body text-sm">
            Details
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={busy}
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-charcoal px-4 py-2 font-body text-sm text-cream disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </form>
      ) : (
        data && (
          <p className="font-body text-sm text-charcoal/60">
            Returns are available after delivery. Refund requests are available
            for paid, delivered or cancelled orders. Contact support for other
            issues.
          </p>
        )
      )}
    </section>
  );
}
