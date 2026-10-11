"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Send, MessageSquare } from "lucide-react";
import { CustomSelect } from "@/components/admin/AdminUI";
import ReturnStatusBadge from "@/components/ReturnStatusBadge";
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
    "w-full rounded-xl border border-charcoal/15 bg-cream px-3.5 py-3 font-body text-sm text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/40 disabled:opacity-50";
  return (
    <section className="space-y-5 rounded-2xl border border-charcoal/10 bg-sand/30 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 font-display text-lg text-charcoal">
          <RotateCcw size={18} className="text-sage" aria-hidden="true" />
          Returns & refunds
        </h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 font-body text-xs text-sage transition hover:bg-sage/10 disabled:opacity-50"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {!data && !error && (
        <p className="font-body text-sm text-charcoal/60">
          Loading request details…
        </p>
      )}
      {request ? (
        <div className="space-y-4 font-body text-sm text-charcoal/80">
          <div className="flex flex-wrap items-center gap-2">
            <ReturnStatusBadge status={request.status} />
            <span className="text-xs text-charcoal/50">
              {request.kind === "RETURN" ? "Return request" : "Refund request"}
            </span>
          </div>
          <p className="font-medium text-charcoal">
            {RETURN_REASONS[request.reason]}
          </p>
          <p className="whitespace-pre-wrap break-words">{request.details}</p>
          {request.customer_message && (
            <p className="whitespace-pre-wrap rounded-lg border border-charcoal/10 p-3">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium text-charcoal/60">
                <MessageSquare size={14} aria-hidden="true" />
                Message from our team
              </span>
              {request.customer_message}
            </p>
          )}
          {(request.refund_amount_cents > 0 || request.refund_state) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream/80 p-4">
              {request.refund_amount_cents > 0 && (
                <div>
                  <p className="text-xs text-charcoal/50">Approved refund</p>
                  <p className="mt-1 font-display text-2xl text-charcoal">
                    {peso(request.refund_amount_cents)}
                  </p>
                </div>
              )}
              {request.refund_state && (
                <div className="space-y-1">
                  <ReturnStatusBadge status={request.refund_state} />
                </div>
              )}
            </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 font-body text-sm">
              <label htmlFor={`return-type-${orderId}`}>Request type</label>
              <CustomSelect
                id={`return-type-${orderId}`}
                value={kind}
                onChange={setKind}
                disabled={busy}
                triggerClassName={field}
                options={[
                  ...(data.canReturn
                    ? [{ value: "RETURN", label: "Return items" }]
                    : []),
                  ...(data.canRefund
                    ? [{ value: "REFUND", label: "Refund without a return" }]
                    : []),
                ]}
              />
            </div>
            <div className="space-y-1 font-body text-sm">
              <label htmlFor={`return-reason-${orderId}`}>Reason</label>
              <CustomSelect
                id={`return-reason-${orderId}`}
                value={reason}
                onChange={setReason}
                disabled={busy}
                triggerClassName={field}
                options={Object.entries(RETURN_REASONS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
          </div>
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage px-5 py-3 font-body text-sm font-medium text-white transition hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 disabled:opacity-50"
          >
            <Send size={15} aria-hidden="true" />
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
