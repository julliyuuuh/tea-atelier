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

const HEADING = "font-body text-xs uppercase tracking-wide text-charcoal/50 mb-3";

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
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

  // Fresh load every time an order is opened.
  useEffect(() => {
    if (orderId === null) return;
    setData(null);
    setActionError("");
    changedRef.current = false;
    load();
  }, [orderId, load]);

  const handleClose = useCallback(() => {
    // Refresh the list behind the panel once, on close, if anything was edited.
    if (changedRef.current) onChanged();
    onClose();
  }, [onChanged, onClose]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
          <SkeletonBlock className="h-24 w-full rounded-xl" />
          <SkeletonBlock className="h-24 w-full rounded-xl" />
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
    const cod = isCod(order.paymentMethod);
    const paymentEditable = cod && !cancelled;
    const currentStep = TRACK_STEPS.findIndex((s) => s.value === order.status);

    return (
      <>
        <ErrorBanner message={errorMessage} onRetry={() => load()} />
        <ErrorBanner message={actionError} />

        {/* Summary */}
        <div className="mb-8">
          <h3 className="font-body text-xl text-charcoal">Order TA-{order.id}</h3>
          <p className="font-body text-xs text-charcoal/40 mt-1">
            Placed {formatDate(order.createdAt, true)}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`inline-flex font-body text-xs px-3 py-1 rounded-full ${sBadge.bg} ${sBadge.text}`}>
              {ORDER_STATUSES.find((s) => s.value === order.status)?.label ?? order.status}
            </span>
            <span className={`inline-flex font-body text-xs px-3 py-1 rounded-full ${pBadge.bg} ${pBadge.text}`}>
              Payment:{" "}
              {PAYMENT_STATUSES.find((s) => s.value === order.paymentStatus)?.label ??
                order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <h4 className={HEADING}>Progress</h4>
          {cancelled ? (
            <p className="font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              This order was cancelled.
            </p>
          ) : (
            <ol className="flex">
              {TRACK_STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const last = idx === TRACK_STEPS.length - 1;
                return (
                  <li key={step.value} className="relative flex-1 flex flex-col items-center">
                    {!last && (
                      <span
                        className={`absolute top-1.5 left-1/2 w-full h-px ${
                          idx < currentStep ? "bg-sage" : "bg-charcoal/15"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 w-3 h-3 rounded-full ${
                        done ? "bg-sage" : "bg-charcoal/15"
                      }`}
                    />
                    <span
                      className={`mt-2 font-body text-[11px] text-center ${
                        done ? "text-charcoal" : "text-charcoal/40"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Manage */}
        <div className="mb-8">
          <h4 className={HEADING}>Manage Order</h4>
          <div className="space-y-3">
            <div>
              <p className="font-body text-xs text-charcoal/50 mb-1.5">Order status</p>
              <CustomSelect
                id="panel-status"
                value={order.status}
                onChange={(value) => patch({ status: value })}
                options={STATUS_OPTIONS}
                disabled={isUpdating}
                triggerClassName={`gap-1.5 font-body text-xs px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-sage ${sBadge.bg} ${sBadge.text}`}
              />
            </div>
            {paymentEditable && (
              <div>
                <p className="font-body text-xs text-charcoal/50 mb-1.5">Payment status</p>
                <CustomSelect
                  id="panel-payment"
                  value={order.paymentStatus}
                  onChange={(value) => patch({ paymentStatus: value })}
                  options={MANUAL_PAYMENT_OPTIONS}
                  disabled={isUpdating}
                  triggerClassName={`gap-1.5 font-body text-xs px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-sage ${pBadge.bg} ${pBadge.text}`}
                />
              </div>
            )}
            {!cod && (
              <p className="font-body text-xs text-charcoal/40">
                Online payments are updated automatically by PayMongo.
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="mb-8">
          <h4 className={HEADING}>Items ({items.length})</h4>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border border-charcoal/10 rounded-xl px-4 py-3"
              >
                <div className="w-10 h-10 rounded-lg bg-sand overflow-hidden shrink-0">
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
                <span className="font-body text-sm text-charcoal/70 tabular-nums">
                  {peso(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 px-1 space-y-1.5 font-body text-sm text-charcoal/70">
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
        </div>

        {/* Customer */}
        <div className="mb-8">
          <h4 className={HEADING}>Customer</h4>
          <Row label="Name" value={customer.name} />
          <Row label="Email" value={customer.email} />
          <Row label="Phone" value={customer.phone} />
          <Row
            label="Member since"
            value={customer.joinedAt ? formatDate(customer.joinedAt) : null}
          />
        </div>

        {/* Delivery */}
        <div className="mb-8">
          <h4 className={HEADING}>Delivery</h4>
          {delivery.length === 0 ? (
            <p className="font-body text-sm text-charcoal/40">No delivery details on file.</p>
          ) : (
            delivery.map((d) => <Row key={d.label} label={d.label} value={d.value} />)
          )}
        </div>

        {/* Payment */}
        <div>
          <h4 className={HEADING}>Payment</h4>
          <Row
            label="Method"
            value={METHOD_LABELS[order.paymentMethod?.toLowerCase()] ?? order.paymentMethod}
          />
          <Row
            label="Status"
            value={
              PAYMENT_STATUSES.find((s) => s.value === order.paymentStatus)?.label ??
              order.paymentStatus
            }
          />
          {order.paymongoSourceId && <Row label="PayMongo ref" value={order.paymongoSourceId} />}
        </div>
      </>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
            className="fixed inset-0 bg-charcoal/30 z-[150]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[151] shadow-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal/10">
              <h2 className="font-body text-lg font-medium text-charcoal">Order Details</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close panel"
                className="text-charcoal/50 hover:text-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6">{renderBody()}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}