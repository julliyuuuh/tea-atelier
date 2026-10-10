"use client";

import { useState } from "react";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import { RETURN_REASONS, peso, type ReturnCase } from "@/lib/returns";
import { isCod } from "@/lib/payment-status";
type History = {
  event_id: string;
  action: string;
  note: string;
  actor_email: string | null;
  created_at: string;
};
export default function ReturnReviewCard({
  request,
  onChanged,
}: {
  request: ReturnCase;
  onChanged: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(
    request.payment_status === "paid" ? String(request.total_amount) : "0.00",
  );
  const [paymentId, setPaymentId] = useState("");
  const [channel, setChannel] = useState("bank");
  const [reference, setReference] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<History[] | null>(null);
  const [viewingOrder, setViewingOrder] = useState(false);
  const cod = isCod(request.payment_method);
  const ready =
    (request.kind === "REFUND" && request.status === "APPROVED") ||
    (request.kind === "RETURN" && request.status === "RECEIVED");
  const unresolved = ["PROCESSING", "PENDING", "UNKNOWN"].includes(
    request.refund_state || "",
  );
  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/returns/${request.return_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          action,
          version: request.version,
          note,
          amount,
          paymentId,
          channel,
          reference,
          confirmSent,
          confirmRefund,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update request.");
      setConfirmRefund(false);
      setConfirmSent(false);
      setHistory(null);
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/returns/${request.return_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load history.");
      setHistory(data.events);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load history.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field =
    "w-full rounded-lg border border-charcoal/15 bg-cream p-2 font-body text-sm text-charcoal";
  const button =
    "rounded-lg border border-charcoal/15 px-3 py-2 font-body text-sm hover:bg-sand/40 disabled:opacity-50";
  return (
    <article className="space-y-4 rounded-xl border border-charcoal/10 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Order #TA-{request.order_id}</h2>
          <p className="font-body text-xs text-charcoal/60">
            {request.customer_email} · {request.kind.toLowerCase()} ·{" "}
            {request.status.toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setViewingOrder(true)}
          className="font-body text-sm text-sage hover:underline"
        >
          View order
        </button>
      </div>
      <p className="font-body text-sm">
        <strong>{RETURN_REASONS[request.reason]}</strong>
      </p>
      <p className="whitespace-pre-wrap break-words font-body text-sm text-charcoal/80">
        {request.details}
      </p>
      <p className="font-body text-sm text-charcoal/60">
        Order total: {peso(Math.round(Number(request.total_amount) * 100))} ·
        Payment: {request.payment_method} / {request.payment_status} · Order:{" "}
        {request.order_status}
      </p>
      {request.customer_message && (
        <p className="whitespace-pre-wrap rounded-lg bg-sand/30 p-3 font-body text-sm">
          Customer message: {request.customer_message}
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-sm text-red-600">
          {error}
        </p>
      )}
      {request.status === "REQUESTED" && (
        <div className="space-y-3">
          <label className="block space-y-1 font-body text-sm">
            Refund amount (PHP)
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={field}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1 font-body text-sm">
            Message to customer / return instructions
            <textarea
              minLength={5}
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={field}
              disabled={busy}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void act("approve")}
              disabled={busy}
              className={button}
            >
              Approve request
            </button>
            <button
              type="button"
              onClick={() => void act("reject")}
              disabled={busy}
              className={button}
            >
              Reject request
            </button>
          </div>
        </div>
      )}
      {request.kind === "RETURN" && request.status === "APPROVED" && (
        <div className="space-y-2">
          <p className="font-body text-sm text-charcoal/60">
            Confirm receipt and inspect the items before issuing any refund.
            Returned tea is not automatically restocked.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("receive")}
            className={button}
          >
            Confirm items received & inspected
          </button>
        </div>
      )}
      {ready && request.refund_amount_cents === 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("close")}
          className={button}
        >
          Close return without refund
        </button>
      )}
      {request.refund_amount_cents > 0 && (
        <p className="font-body text-sm">
          Approved refund: <strong>{peso(request.refund_amount_cents)}</strong>
        </p>
      )}
      {request.refund_state && (
        <p className="font-body text-sm">
          Refund status: <strong>{request.refund_state.toLowerCase()}</strong>
          {request.refund_is_test ? " · PayMongo test mode" : ""}
          {request.refund_reference
            ? ` · Reference: ${request.refund_reference}`
            : ""}
        </p>
      )}
      {request.refund_error && (
        <p className="font-body text-sm text-red-600">{request.refund_error}</p>
      )}
      {unresolved && !cod && (
        <div className="space-y-2">
          <p className="font-body text-sm text-charcoal/60">
            Check the provider outcome. A second refund is blocked while this
            attempt is unresolved.
          </p>
          <button
            type="button"
            onClick={() => void act("check_refund")}
            disabled={busy}
            className={button}
          >
            Check PayMongo refund status
          </button>
        </div>
      )}
      {ready &&
        request.refund_amount_cents > 0 &&
        !unresolved &&
        request.refund_state !== "SUCCEEDED" && (
          <div className="space-y-3 border-t border-charcoal/10 pt-4">
            {!cod && !request.paymongo_payment_id ? (
              <>
                <p className="font-body text-sm text-charcoal/60">
                  Older payment: copy its payment ID from PayMongo. The server
                  verifies it against this order before linking.
                </p>
                <label className="block space-y-1 font-body text-sm">
                  PayMongo payment ID
                  <input
                    className={field}
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    placeholder="pay_…"
                    disabled={busy}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("link_payment")}
                  className={button}
                >
                  Verify & link test payment
                </button>
              </>
            ) : (
              <>
                {cod ? (
                  <>
                    <label className="block space-y-1 font-body text-sm">
                      Refund method
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        disabled={busy}
                        className={field}
                      >
                        <option value="bank">Bank transfer</option>
                        <option value="ewallet">E-wallet</option>
                        <option value="cash">Cash</option>
                      </select>
                    </label>
                    <label className="block space-y-1 font-body text-sm">
                      Transfer / receipt reference
                      <input
                        className={field}
                        value={reference}
                        maxLength={150}
                        onChange={(e) => setReference(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex items-start gap-2 font-body text-sm">
                      <input
                        type="checkbox"
                        checked={confirmSent}
                        onChange={(e) => setConfirmSent(e.target.checked)}
                        disabled={busy}
                      />
                      I have already sent this COD refund. This action only
                      records it.
                    </label>
                  </>
                ) : (
                  <label className="flex items-start gap-2 font-body text-sm">
                    <input
                      type="checkbox"
                      checked={confirmRefund}
                      onChange={(e) => setConfirmRefund(e.target.checked)}
                      disabled={busy}
                    />
                    Issue a PayMongo test refund of{" "}
                    {peso(request.refund_amount_cents)} to the original payment.
                  </label>
                )}
                <button
                  type="button"
                  disabled={busy || (cod ? !confirmSent : !confirmRefund)}
                  onClick={() => void act("refund")}
                  className={button}
                >
                  {busy
                    ? "Processing…"
                    : cod
                      ? "Record COD refund sent"
                      : "Issue test refund"}
                </button>
              </>
            )}
          </div>
        )}
      <button
        type="button"
        className="font-body text-xs text-sage hover:underline"
        disabled={busy}
        onClick={() => (history ? setHistory(null) : void loadHistory())}
      >
        {history ? "Hide" : "View"} audit history
      </button>
      {history && (
        <ol className="space-y-2 border-t border-charcoal/10 pt-3 font-body text-xs text-charcoal/60">
          {history.map((entry) => (
            <li key={entry.event_id}>
              <strong>{entry.action.replaceAll("_", " ")}</strong> ·{" "}
              {new Date(entry.created_at).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
              })}{" "}
              · {entry.actor_email || "Deleted account"}
              {entry.note && (
                <p className="whitespace-pre-wrap">{entry.note}</p>
              )}
            </li>
          ))}
        </ol>
      )}
      <OrderDetailModal
        orderId={viewingOrder ? request.order_id : null}
        onClose={() => setViewingOrder(false)}
        onChanged={() => void onChanged()}
      />
    </article>
  );
}
