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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal/30 z-[150]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[151] shadow-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal/10">
              <h2 className="font-body text-lg font-medium text-charcoal">
                Customer Details
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="text-charcoal/50 hover:text-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              {isLoading && (
                <div className="space-y-3">
                  <SkeletonBlock className="w-16 h-16 rounded-full" />
                  <SkeletonBlock className="h-5 w-40" />
                  <SkeletonBlock className="h-4 w-56" />
                  <SkeletonBlock className="h-4 w-32" />
                </div>
              )}

              {!isLoading && errorMessage && (
                <p className="font-body text-sm text-red-600">{errorMessage}</p>
              )}

              {!isLoading && customer && (
                <>
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      {customer.avatarUrl ? (
                        <img
                          src={customer.avatarUrl}
                          alt={customer.name}
                          className="w-16 h-16 rounded-full object-cover shrink-0 bg-sand"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-sage/20 text-sage flex items-center justify-center font-body text-xl font-medium shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-body text-xl text-charcoal truncate">
                          {customer.name}
                        </h3>
                        <p className="font-body text-sm text-charcoal/60 truncate">
                          {customer.email}
                        </p>
                      </div>
                    </div>

                    <p className="font-body text-sm text-charcoal/60">
                      {customer.phone || "No phone on file"}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                          customer.isVerified
                            ? "bg-green-100 text-green-700"
                            : "bg-charcoal/10 text-charcoal/50"
                        }`}
                      >
                        {customer.isVerified ? "Verified" : "Unverified"}
                      </span>
                      {customer.isSuspended && (
                        <span className="inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full bg-red-50 text-red-600">
                          Suspended
                        </span>
                      )}
                    </div>

                    <p className="font-body text-xs text-charcoal/40 mt-4">
                      Joined{" "}
                      {new Date(customer.joinedAt).toLocaleDateString("en-PH", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-body text-xs uppercase tracking-wide text-charcoal/50 mb-3">
                      Order History
                    </h4>

                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-center py-8 bg-sand/20 rounded-xl">
                        <ShoppingBag className="w-6 h-6 text-charcoal/20" />
                        <span className="font-body text-sm text-charcoal/40">
                          No orders yet.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orders.map((order) => {
                          const badge = statusBadge(order.status);
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between border border-charcoal/10 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="font-body text-sm text-charcoal">
                                  TA-{order.id}
                                </p>
                                <p className="font-body text-xs text-charcoal/50">
                                  {new Date(order.createdAt).toLocaleDateString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
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
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}