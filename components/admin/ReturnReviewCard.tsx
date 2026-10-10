"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  History as HistoryIcon,
  MessageSquare,
  ReceiptText,
  X,
} from "lucide-react";
import { CustomSelect } from "@/components/admin/AdminUI";
import ReturnStatusBadge from "@/components/ReturnStatusBadge";
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
    "w-full rounded-xl border border-charcoal/15 bg-cream px-3.5 py-3 font-body text-sm text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/40 disabled:opacity-50";
  const button =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-charcoal/15 px-4 py-2.5 font-body text-sm font-medium transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <article className="space-y-5 rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">
            Order #TA-{request.order_id}
          </h2>
          <p className="font-body text-xs text-charcoal/60">
            {request.customer_email}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ReturnStatusBadge status={request.status} />
            <span className="font-body text-xs text-charcoal/50">
              {request.kind === "RETURN" ? "Return request" : "Refund request"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setViewingOrder(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-2 font-body text-sm text-sage transition hover:bg-sage/10"
        >
          View order <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="font-body text-sm">
        <strong>{RETURN_REASONS[request.reason]}</strong>
      </p>
      <p className="whitespace-pre-wrap break-words font-body text-sm text-charcoal/80">
        {request.details}
      </p>
      <dl className="grid grid-cols-2 gap-4 rounded-xl bg-cream p-4 font-body text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-charcoal/50">Order total</dt>
          <dd className="mt-1 font-medium">
            {peso(Math.round(Number(request.total_amount) * 100))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-charcoal/50">Payment</dt>
          <dd className="mt-1 capitalize">
            {cod ? "COD" : request.payment_method} · {request.payment_status}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-charcoal/50">Order status</dt>
          <dd className="mt-1 capitalize">
            {request.order_status?.toLowerCase()}
          </dd>
        </div>
      </dl>
      {request.customer_message && (
        <p className="whitespace-pre-wrap rounded-lg bg-sand/30 p-3 font-body text-sm">
          <span className="mb-2 flex items-center gap-2 text-xs font-medium text-charcoal/60">
            <MessageSquare size={14} aria-hidden="true" />
            Message to customer
          </span>
          {request.customer_message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 font-body text-sm text-red-700"
        >
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void act("approve")}
              disabled={busy}
              className={`${button} border-sage bg-sage text-white hover:bg-sage/90`}
            >
              <Check size={16} aria-hidden="true" /> Approve request
            </button>
            <button
              type="button"
              onClick={() => void act("reject")}
              disabled={busy}
              className={button}
            >
              <X size={16} aria-hidden="true" /> Reject request
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
      {(request.refund_amount_cents > 0 || request.refund_state) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sage/20 bg-sage/5 p-4">
          {request.refund_amount_cents > 0 && (
            <div>
              <p className="font-body text-xs text-charcoal/60">
                Approved refund
              </p>
              <p className="mt-1 font-display text-2xl">
                {peso(request.refund_amount_cents)}
              </p>
            </div>
          )}
          {request.refund_state && (
            <div className="space-y-2">
              <ReturnStatusBadge status={request.refund_state} />
              {request.refund_is_test && (
                <p className="font-body text-xs text-charcoal/50">
                  PayMongo test mode
                </p>
              )}
            </div>
          )}
          {request.refund_reference && (
            <p className="flex w-full items-start gap-2 border-t border-sage/15 pt-3 font-body text-xs text-charcoal/60">
              <ReceiptText size={15} className="shrink-0" aria-hidden="true" />
              <span>
                Reference:{" "}
                <span className="break-all text-charcoal">
                  {request.refund_reference}
                </span>
              </span>
            </p>
          )}
        </div>
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
                    <div className="space-y-1 font-body text-sm">
                      <label htmlFor={`refund-method-${request.return_id}`}>
                        Refund method
                      </label>
                      <CustomSelect
                        id={`refund-method-${request.return_id}`}
                        value={channel}
                        onChange={setChannel}
                        disabled={busy}
                        triggerClassName={field}
                        options={[
                          { value: "bank", label: "Bank transfer" },
                          { value: "ewallet", label: "E-wallet" },
                          { value: "cash", label: "Cash" },
                        ]}
                      />
                    </div>
                    <label className="block space-y-1 font-body text-sm">
                      Transfer / receipt reference
                      <input
                        className={field}
                        value={reference}
                        maxLength={150}
                        placeholder={
                          channel === "cash"
                            ? `Cash receipt / voucher number`
                            : "Transaction reference number"
                        }
                        onChange={(e) => setReference(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex items-start gap-2 font-body text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-sage"
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
                      className="mt-0.5 size-4 shrink-0 accent-sage"
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
                  className={`${button} border-sage bg-sage text-white hover:bg-sage/90`}
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
        className="inline-flex items-center gap-2 rounded-lg py-2 font-body text-xs text-sage hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
        disabled={busy}
        aria-expanded={!!history}
        onClick={() => (history ? setHistory(null) : void loadHistory())}
      >
        <HistoryIcon size={15} aria-hidden="true" />
        {history ? "Hide" : "View"} audit history{" "}
        <ChevronDown
          size={14}
          className={history ? "rotate-180" : ""}
          aria-hidden="true"
        />
      </button>
      {history && (
        <ol className="space-y-4 border-l-2 border-sage/20 pl-4 font-body text-xs text-charcoal/60">
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
