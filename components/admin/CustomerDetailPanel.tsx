"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import { ORDER_STATUSES } from "@/lib/order-status";

const ORDERS_PER_PAGE = 5;

type CustomerDetail = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  joinedAt: string;
};

type CustomerOrder = {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

type OrdersMeta = { page: number; total: number; totalPages: number };

function statusBadge(status: string) {
  switch (status) {
    case "PLACED":
      return { bg: "bg-amber-50", text: "text-amber-700" };
    case "PROCESSING":
      return { bg: "bg-purple-50", text: "text-purple-700" };
    case "SHIPPED":
      return { bg: "bg-blue-50", text: "text-blue-700" };
    case "DELIVERED":
      return { bg: "bg-green-100", text: "text-green-700" };
    case "CANCELLED":
      return { bg: "bg-red-50", text: "text-red-600" };
    default:
      return { bg: "bg-charcoal/10", text: "text-charcoal/60" };
  }
}

const statusLabel = (status: string) =>
  ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;

const formatDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });

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

export default function CustomerDetailPanel({
  open,
  customerId,
  onClose,
}: {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
}) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersMeta, setOrdersMeta] = useState<OrdersMeta>({ page: 1, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Loads the customer plus one page of orders. Runs when the modal opens,
  // when a different customer is chosen, and when the page changes.
  useEffect(() => {
    if (!open || customerId == null) {
      setPage(1); // start from page 1 next time it opens
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem("token");
    fetch(`/api/admin/customers/${customerId}?page=${page}&limit=${ORDERS_PER_PAGE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load customer.");
        if (cancelled) return;
        setCustomer(data.customer);
        setOrders(data.orders);
        setOrdersMeta({
          page: data.ordersPage,
          total: data.ordersTotal,
          totalPages: data.ordersTotalPages,
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, customerId, page]);

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Only show a customer's data if it belongs to the one currently selected.
  const current = customer && customer.id === customerId ? customer : null;
  const rangeStart = (ordersMeta.page - 1) * ORDERS_PER_PAGE + 1;
  const rangeEnd = rangeStart + orders.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-charcoal/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Customer details"
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-charcoal/10">
              <div className="min-w-0">
                <h2 className="font-body text-lg font-medium text-charcoal truncate">
                  {current ? current.name : "Customer Details"}
                </h2>
                {current && (
                  <p className="font-body text-xs text-charcoal/50 mt-0.5 truncate">
                    {current.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {current && (
                  <>
                    <span
                      className={`hidden sm:inline-flex font-body text-xs px-3 py-1 rounded-full ${
                        current.isVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-charcoal/10 text-charcoal/50"
                      }`}
                    >
                      {current.isVerified ? "Verified" : "Unverified"}
                    </span>
                    {current.isSuspended && (
                      <span className="hidden sm:inline-flex font-body text-xs px-3 py-1 rounded-full bg-red-50 text-red-600">
                        Suspended
                      </span>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-charcoal/50 hover:text-charcoal hover:bg-sand/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoading && !current && (
                <div className="grid gap-4 md:grid-cols-5">
                  <SkeletonBlock className="h-56 md:col-span-2 rounded-xl" />
                  <SkeletonBlock className="h-56 md:col-span-3 rounded-xl" />
                </div>
              )}

              {errorMessage && (
                <p className="font-body text-sm text-red-600 mb-4">{errorMessage}</p>
              )}

              {current && (
                <div className="grid gap-4 md:grid-cols-5 items-start">
                  {/* Left: profile */}
                  <div className="md:col-span-2">
                    <Section title="Profile">
                      <div className="flex items-center gap-3 mb-3">
                        {current.avatarUrl ? (
                          <img
                            src={current.avatarUrl}
                            alt={current.name}
                            className="w-14 h-14 rounded-full object-cover shrink-0 bg-sand"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-sage/20 text-sage flex items-center justify-center font-body text-lg font-medium shrink-0">
                            {current.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-body text-sm text-charcoal truncate">
                            {current.name}
                          </p>
                          <p className="font-body text-xs text-charcoal/50 truncate">
                            {current.email}
                          </p>
                        </div>
                      </div>
                      <Row label="Phone" value={current.phone} />
                      <Row label="Joined" value={formatDate(current.joinedAt, true)} />
                      <Row label="Email" value={current.isVerified ? "Verified" : "Unverified"} />
                      <Row label="Account" value={current.isSuspended ? "Suspended" : "Active"} />
                    </Section>
                  </div>

                  {/* Right: order history */}
                  <div className="md:col-span-3">
                    <Section title={`Order History (${ordersMeta.total})`}>
                      {ordersMeta.total === 0 ? (
                        <div className="flex flex-col items-center gap-2 text-center py-8 bg-sand/20 rounded-xl">
                          <ShoppingBag className="w-6 h-6 text-charcoal/20" />
                          <span className="font-body text-sm text-charcoal/40">
                            No orders yet.
                          </span>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`divide-y divide-charcoal/5 transition-opacity ${
                              isLoading ? "opacity-50" : "opacity-100"
                            }`}
                          >
                            {orders.map((order) => {
                              const badge = statusBadge(order.status);
                              return (
                                <div
                                  key={order.id}
                                  className="flex items-center justify-between gap-3 py-2.5"
                                >
                                  <div>
                                    <p className="font-body text-sm text-charcoal">
                                      TA-{order.id}
                                    </p>
                                    <p className="font-body text-xs text-charcoal/50">
                                      {formatDate(order.createdAt)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-body text-sm text-charcoal/70 tabular-nums">
                                      ₱{order.totalAmount.toFixed(2)}
                                    </span>
                                    <span
                                      className={`font-body text-xs px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}
                                    >
                                      {statusLabel(order.status)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {ordersMeta.totalPages > 1 && (
                            <div className="flex items-center justify-between pt-3 mt-1 border-t border-charcoal/10">
                              <span className="font-body text-xs text-charcoal/50">
                                {rangeStart}–{rangeEnd} of {ordersMeta.total}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                                  disabled={isLoading || ordersMeta.page === 1}
                                  className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
                                >
                                  Back
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPage((p) => Math.min(ordersMeta.totalPages, p + 1))
                                  }
                                  disabled={isLoading || ordersMeta.page === ordersMeta.totalPages}
                                  className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </Section>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}