"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import { ORDER_STATUSES } from "@/lib/order-status";
import {
  PAYMENT_STATUSES,
  MANUAL_PAYMENT_STATUSES,
  isCod,
  isUnpaidOnline,
} from "@/lib/payment-status";
import { ErrorBanner, CustomSelect } from "@/components/admin/AdminUI";

type Item = { id: number; name: string; image: string | null; quantity: number; price: number };

type OrderDetail = {
  order: {
    id: number;
    status: string;
    createdAt: string;
    paymentMethod: string;
    paymentStatus: string;
    paymongoSourceId: string | null;
  };
  customer: { name: string | null; email: string; phone: string | null; joinedAt: string | null };
  delivery: { label: string; value: string }[];
  items: Item[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

const STATUS_OPTIONS = ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label }));
const TRACK_STEPS = ORDER_STATUSES.filter((s) => s.value !== "CANCELLED");
const MANUAL_PAYMENT_OPTIONS = PAYMENT_STATUSES.filter((s) =>
  MANUAL_PAYMENT_STATUSES.includes(s.value),
).map((s) => ({ value: s.value, label: s.label }));

const METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  gcash: "GCash",
  paymaya: "Maya",
  grabpay: "GrabPay",
};

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

function statusBadge(status: string) {
  switch (status) {
    case "PLACED": return { bg: "bg-amber-50", text: "text-amber-700" };
    case "PROCESSING": return { bg: "bg-purple-50", text: "text-purple-700" };
    case "SHIPPED": return { bg: "bg-blue-50", text: "text-blue-700" };
    case "DELIVERED": return { bg: "bg-green-100", text: "text-green-700" };
    case "CANCELLED": return { bg: "bg-red-50", text: "text-red-600" };
    default: return { bg: "bg-charcoal/10", text: "text-charcoal/60" };
  }
}

function paymentBadge(status: string) {
  switch (status) {
    case "paid": return { bg: "bg-green-100", text: "text-green-700" };
    case "failed": return { bg: "bg-red-50", text: "text-red-600" };
    default: return { bg: "bg-amber-50", text: "text-amber-700" };
  }
}

// "processing" is the webhook's short-lived lock while it charges an order,
// so it reads the same as pending. Online pending reads "Awaiting payment".
function paymentLabel(status: string, method: string) {
  if (status === "paid") return "Paid";
  if (status === "failed") return "Failed";
  return isCod(method) ? "Pending" : "Awaiting payment";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-charcoal/10 rounded-xl p-4">
      <h3 className="font-body text-xs uppercase tracking-wide text-charcoal/50 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="font-body text-xs text-charcoal/50 shrink-0">{label}</span>
      <span className="font-body text-sm text-charcoal text-right break-words min-w-0">
        {value || "—"}
      </span>
    </div>
  );
}

type Props = {
  orderId: number | null;
  onClose: () => void;
  onChanged: () => void;
};

export default function OrderDetailModal({ orderId, onClose, onChanged }: Props) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const changedRef = useRef(false);

  const open = orderId !== null;

  const load = useCallback(
    async (silent = false) => {
      if (orderId === null) return;
      if (!silent) setIsLoading(true);
      setErrorMessage("");
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load order.");
        setData(json);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [orderId],
  );

  // Fresh load every time a different order is opened.
  useEffect(() => {
    if (orderId === null) return;
    setData(null);
    setActionError("");
    changedRef.current = false;
    load();
  }, [orderId, load]);

  const handleClose = useCallback(() => {
    // Refresh the list behind the modal once, on close, if anything was edited.
    if (changedRef.current) onChanged();
    onClose();
  }, [onChanged, onClose]);

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleClose]);

  const patch = async (body: { status?: string; paymentStatus?: string }) => {
    setIsUpdating(true);
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to update order.");
      changedRef.current = true;
      await load(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderBody = () => {
    if (isLoading && !data) {
      return (
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-5">
            <SkeletonBlock className="h-56 md:col-span-3 rounded-xl" />
            <SkeletonBlock className="h-56 md:col-span-2 rounded-xl" />
          </div>
        </div>
      );
    }

    if (!data) {
      return <ErrorBanner message={errorMessage} onRetry={() => load()} />;
    }

    const { order, customer, delivery, items, subtotal, deliveryFee, total } = data;
    const sBadge = statusBadge(order.status);
    const pBadge = paymentBadge(order.paymentStatus);
    const cancelled = order.status === "CANCELLED";
    const paymentEditable = isCod(order.paymentMethod) && !cancelled;
    const currentStep = TRACK_STEPS.findIndex((s) => s.value === order.status);

    // Unpaid online orders can only stay at PLACED or be cancelled (the API
    // enforces this too), so don't offer the forward steps.
    const unpaidOnline = isUnpaidOnline(order.paymentMethod, order.paymentStatus);
    const statusOptions = unpaidOnline
      ? STATUS_OPTIONS.filter(
          (o) =>
            o.value === order.status || o.value === "PLACED" || o.value === "CANCELLED",
        )
      : STATUS_OPTIONS;

    return (
      <>
        <ErrorBanner message={errorMessage} onRetry={() => load()} />
        <ErrorBanner message={actionError} />

        {/* Progress */}
        <div className="border border-charcoal/10 rounded-xl p-4 mb-4 overflow-x-auto">
          {cancelled ? (
            <p className="font-body text-sm text-red-600">This order was cancelled.</p>
          ) : (
            <ol className="flex items-center min-w-[420px]">
              {TRACK_STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const last = idx === TRACK_STEPS.length - 1;
                return (
                  <li key={step.value} className={`flex items-center gap-2 ${last ? "" : "flex-1"}`}>
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${done ? "bg-sage" : "bg-charcoal/15"}`}
                    />
                    <span
                      className={`font-body text-xs whitespace-nowrap ${
                        done ? "text-charcoal" : "text-charcoal/40"
                      }`}
                    >
                      {step.label}
                    </span>
                    {!last && (
                      <span
                        className={`flex-1 h-px mx-2 ${
                          idx < currentStep ? "bg-sage" : "bg-charcoal/15"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-5 items-start">
          {/* Left: items + totals */}
          <div className="md:col-span-3">
            <Section title={`Items (${items.length})`}>
              <div className="divide-y divide-charcoal/5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-11 h-11 rounded-lg bg-sand overflow-hidden shrink-0">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-charcoal truncate">{item.name}</p>
                      <p className="font-body text-xs text-charcoal/50">
                        {peso(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-body text-sm text-charcoal tabular-nums">
                      {peso(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-1 pt-3 border-t border-charcoal/10 space-y-1.5 font-body text-sm text-charcoal/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{peso(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span className="tabular-nums">{peso(deliveryFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-charcoal/10 text-charcoal font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{peso(total)}</span>
                </div>
              </div>
            </Section>
          </div>

          {/* Right: manage, customer, delivery, payment */}
          <div className="md:col-span-2 space-y-4">
            <Section title="Manage order">
              <div className="space-y-3">
                <div>
                  <p className="font-body text-xs text-charcoal/50 mb-1.5">Order status</p>
                  <CustomSelect
                    id="modal-status"
                    value={order.status}
                    onChange={(value) => patch({ status: value })}
                    options={statusOptions}
                    disabled={isUpdating}
                    triggerClassName={`gap-1.5 font-body text-xs px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-sage ${sBadge.bg} ${sBadge.text}`}
                  />
                  {unpaidOnline && !cancelled && (
                    <p className="font-body text-xs text-charcoal/50 mt-2">
                      This order can't move past Order Placed until its payment is
                      confirmed.
                    </p>
                  )}
                </div>
                {paymentEditable && (
                  <div>
                    <p className="font-body text-xs text-charcoal/50 mb-1.5">Payment status</p>
                    <CustomSelect
                      id="modal-payment"
                      value={order.paymentStatus}
                      onChange={(value) => patch({ paymentStatus: value })}
                      options={MANUAL_PAYMENT_OPTIONS}
                      disabled={isUpdating}
                      triggerClassName={`gap-1.5 font-body text-xs px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-sage ${pBadge.bg} ${pBadge.text}`}
                    />
                  </div>
                )}
              </div>
            </Section>

            <Section title="Customer">
              <Row label="Name" value={customer.name} />
              <Row label="Email" value={customer.email} />
              <Row label="Phone" value={customer.phone} />
              <Row
                label="Member since"
                value={customer.joinedAt ? formatDate(customer.joinedAt) : null}
              />
            </Section>

            <Section title="Delivery">
              {delivery.length === 0 ? (
                <p className="font-body text-sm text-charcoal/40">No delivery details on file.</p>
              ) : (
                delivery.map((d) => <Row key={d.label} label={d.label} value={d.value} />)
              )}
            </Section>

            <Section title="Payment">
              <Row
                label="Method"
                value={METHOD_LABELS[order.paymentMethod?.toLowerCase()] ?? order.paymentMethod}
              />
              <Row
                label="Status"
                value={paymentLabel(order.paymentStatus, order.paymentMethod)}
              />
              {order.paymongoSourceId && (
                <Row label="PayMongo ref" value={order.paymongoSourceId} />
              )}
            </Section>
          </div>
        </div>
      </>
    );
  };

  const sBadgeHeader = data ? statusBadge(data.order.status) : null;
  const pBadgeHeader = data ? paymentBadge(data.order.paymentStatus) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Order TA-${orderId}`}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-charcoal/10">
              <div className="min-w-0">
                <h2 className="font-body text-lg font-medium text-charcoal">
                  Order TA-{orderId}
                </h2>
                {data && (
                  <p className="font-body text-xs text-charcoal/50 mt-0.5">
                    Placed {formatDate(data.order.createdAt, true)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {data && sBadgeHeader && pBadgeHeader && (
                  <>
                    <span
                      className={`hidden sm:inline-flex font-body text-xs px-3 py-1 rounded-full ${sBadgeHeader.bg} ${sBadgeHeader.text}`}
                    >
                      {ORDER_STATUSES.find((s) => s.value === data.order.status)?.label ??
                        data.order.status}
                    </span>
                    <span
                      className={`hidden sm:inline-flex font-body text-xs px-3 py-1 rounded-full ${pBadgeHeader.bg} ${pBadgeHeader.text}`}
                    >
                      {paymentLabel(data.order.paymentStatus, data.order.paymentMethod)}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-charcoal/50 hover:text-charcoal hover:bg-sand/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">{renderBody()}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}