"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || customerId == null) return;

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage("");
    setCustomer(null);
    setOrders([]);

    const token = localStorage.getItem("token");
    fetch(`/api/admin/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load customer.");
        if (cancelled) return;
        setCustomer(data.customer);
        setOrders(data.orders);
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
  }, [open, customerId]);

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
                  {customer ? customer.name : "Customer Details"}
                </h2>
                {customer && (
                  <p className="font-body text-xs text-charcoal/50 mt-0.5 truncate">
                    {customer.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {customer && (
                  <>
                    <span
                      className={`hidden sm:inline-flex font-body text-xs px-3 py-1 rounded-full ${
                        customer.isVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-charcoal/10 text-charcoal/50"
                      }`}
                    >
                      {customer.isVerified ? "Verified" : "Unverified"}
                    </span>
                    {customer.isSuspended && (
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
              {isLoading && (
                <div className="grid gap-4 md:grid-cols-5">
                  <SkeletonBlock className="h-56 md:col-span-2 rounded-xl" />
                  <SkeletonBlock className="h-56 md:col-span-3 rounded-xl" />
                </div>
              )}

              {!isLoading && errorMessage && (
                <p className="font-body text-sm text-red-600">{errorMessage}</p>
              )}

              {!isLoading && customer && (
                <div className="grid gap-4 md:grid-cols-5 items-start">
                  {/* Left: profile */}
                  <div className="md:col-span-2">
                    <Section title="Profile">
                      <div className="flex items-center gap-3 mb-3">
                        {customer.avatarUrl ? (
                          <img
                            src={customer.avatarUrl}
                            alt={customer.name}
                            className="w-14 h-14 rounded-full object-cover shrink-0 bg-sand"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-sage/20 text-sage flex items-center justify-center font-body text-lg font-medium shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-body text-sm text-charcoal truncate">
                            {customer.name}
                          </p>
                          <p className="font-body text-xs text-charcoal/50 truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                      <Row label="Phone" value={customer.phone} />
                      <Row label="Joined" value={formatDate(customer.joinedAt, true)} />
                      <Row label="Email" value={customer.isVerified ? "Verified" : "Unverified"} />
                      <Row label="Account" value={customer.isSuspended ? "Suspended" : "Active"} />
                    </Section>
                  </div>

                  {/* Right: order history */}
                  <div className="md:col-span-3">
                    <Section title={`Order History (${orders.length})`}>
                      {orders.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 text-center py-8 bg-sand/20 rounded-xl">
                          <ShoppingBag className="w-6 h-6 text-charcoal/20" />
                          <span className="font-body text-sm text-charcoal/40">
                            No orders yet.
                          </span>
                        </div>
                      ) : (
                        <div className="divide-y divide-charcoal/5">
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
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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