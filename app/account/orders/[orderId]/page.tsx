"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getStatusLabel } from "@/lib/order-status";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Package,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Badge from "@/components/account/Badge";
import OrderDocumentButtons from "@/components/OrderDocumentButtons";
import OrderReturnPanel from "@/components/account/OrderReturnPanel";
import OrderReviews from "@/components/reviews/OrderReviews";

// ---------- types (match /api/orders/[orderId] response) ----------

type OrderItem = {
  productId: number;
  name: string;
  image: string;
  quantity: number;
  price: number;
};

type OrderDetails = {
  orderId: number;
  recipientName: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  subtotal: number;
  deliveryFee: number;
  shippingLabel?: string;
  total: number;
  items: OrderItem[];
};

// ---------- helpers ----------

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cod: "Cash on Delivery",
    gcash: "GCash",
    grabpay: "GrabPay",
    credit: "Credit Card",
    paypal: "PayPal",
  };
  return labels[method] || method;
}

const TRACKING_STEPS = [
  {
    key: "placed",
    label: "Order Placed",
    description: "We've received your order.",
    icon: ClipboardList,
  },
  {
    key: "processing",
    label: "Processing",
    description: "Your tea is being packed.",
    icon: Package,
  },
  {
    key: "shipped",
    label: "Shipped",
    description: "On its way to you.",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Enjoy your tea!",
    icon: PackageCheck,
  },
] as const;

// Map your order_status values to a step index. Adjust keys to match your DB.
function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    placed: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    completed: 3,
  };
  return map[status.toLowerCase()] ?? 0;
}

// ---------- tracker ----------

function OrderTracker({
  status,
  paymentFailed,
  paymentPending,
}: {
  status: string;
  paymentFailed: boolean;
  paymentPending: boolean;
}) {
  if (status.toLowerCase() === "cancelled") {
    return (
      <div className="rounded-xl bg-red-50 p-4">
        <p className="font-body text-sm text-red-600">
          This order was cancelled.
        </p>
      </div>
    );
  }

  if (paymentFailed) {
    return (
      <div className="rounded-xl bg-red-50 p-4">
        <p className="font-body text-sm text-red-600">
          This order&apos;s payment didn&apos;t go through, so it hasn&apos;t
          been processed.
        </p>
      </div>
    );
  }

  if (paymentPending) {
    return (
      <div className="rounded-xl bg-amber-50 p-4">
        <p className="font-body text-sm text-amber-700">
          Waiting for payment confirmation from your payment provider.
        </p>
      </div>
    );
  }

  const current = getStepIndex(status);
  const lastIndex = TRACKING_STEPS.length - 1;

  return (
    <ol className="relative" aria-label="Order progress">
      {TRACKING_STEPS.map((step, i) => {
        const done = i < current || current === lastIndex;
        const active = i === current && !done;
        const Icon = step.icon;
        const isLast = i === lastIndex;

        return (
          <li
            key={step.key}
            aria-current={i === current ? "step" : undefined}
            className="relative flex gap-4 pb-7 last:pb-0"
          >
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-full w-px ${
                  i < current ? "bg-sage" : "bg-charcoal/15"
                }`}
              />
            )}

            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? "bg-sage border-sage text-white"
                  : active
                    ? "border-sage text-sage bg-white ring-4 ring-sage/20"
                    : "border-charcoal/20 text-charcoal/30 bg-white"
              }`}
            >
              {done ? (
                <Check size={16} />
              ) : (
                <Icon size={16} strokeWidth={1.5} />
              )}
            </div>

            <div className="pt-1">
              <p
                className={`font-body text-sm ${
                  done || active ? "text-charcoal" : "text-charcoal/40"
                }`}
              >
                {step.label}
              </p>
              <p className="font-body text-xs text-charcoal/50 mt-0.5">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- page ----------

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { logout } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) {
          logout();
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load order.");
        setOrder(data);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/account"
        className="mb-6 flex items-center gap-2 font-body text-sm text-charcoal/60 hover:text-charcoal"
      >
        <ArrowLeft size={16} /> Back to orders
      </Link>

      {isLoading && (
        <p className="font-body text-sm text-charcoal/50">Loading...</p>
      )}

      {errorMessage && (
        <p className="py-16 text-center font-body text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {order &&
        (() => {
          const isCod = order.paymentMethod === "cod";
          const paymentFailed = !isCod && order.paymentStatus === "failed";
          const paymentPending =
            !isCod && ["pending", "processing"].includes(order.paymentStatus);

          const itemCount = order.items.reduce(
            (total, item) => total + item.quantity,
            0,
          );
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header className="flex flex-col gap-5 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between lg:pb-8">
                <div className="min-w-0 space-y-3">
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-sage">
                    Order details
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl text-charcoal sm:text-4xl">
                      Order #TA-{order.orderId}
                    </h1>
                    {order.orderStatus === "CANCELLED" ? (
                      <Badge tone="neutral">
                        {getStatusLabel(order.orderStatus)}
                      </Badge>
                    ) : paymentFailed || paymentPending ? (
                      <Badge tone="amber">
                        {paymentFailed
                          ? "Payment Failed"
                          : order.paymentStatus === "processing"
                            ? "Confirming Payment"
                            : "Awaiting Payment"}
                      </Badge>
                    ) : (
                      <Badge tone="sage">
                        {getStatusLabel(order.orderStatus)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-xs text-charcoal/60">
                    <span>
                      Placed on{" "}
                      <time dateTime={order.createdAt}>
                        {new Date(order.createdAt).toLocaleDateString("en-PH", {
                          timeZone: "Asia/Manila",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </span>
                    {order.recipientName && (
                      <span className="break-words">
                        For: {order.recipientName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <OrderDocumentButtons
                    key={order.orderId}
                    orderId={order.orderId}
                  />
                </div>
              </header>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
                <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
                  <section
                    className="order-1 min-w-0 overflow-hidden rounded-2xl border border-charcoal/10 bg-white lg:order-none"
                    aria-labelledby="order-items-heading"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 px-5 py-5 sm:px-6">
                      <h2
                        id="order-items-heading"
                        className="font-display text-xl text-charcoal"
                      >
                        Your tea selection
                      </h2>
                      <span className="rounded-full bg-sand/30 px-3 py-1 font-body text-xs text-charcoal/60">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
                      {order.items.map((item, index) => (
                        <li
                          key={`${item.productId}:${index}`}
                          className="flex items-center gap-3 py-5 sm:gap-4"
                        >
                          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand/30 sm:size-20">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package
                                size={24}
                                className="text-sage"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-body text-sm font-medium text-charcoal sm:text-base">
                              {item.name}
                            </p>
                            <p className="mt-1 font-body text-xs text-charcoal/50">
                              ₱{item.price.toFixed(2)} each
                            </p>
                            <span className="mt-2 inline-flex rounded-full border border-charcoal/10 px-2.5 py-0.5 font-body text-xs text-charcoal/60">
                              Qty {item.quantity}
                            </span>
                          </div>
                          <p className="shrink-0 font-body text-sm font-medium text-charcoal">
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-4 border-t border-charcoal/10 bg-sand/20 px-5 py-5 sm:px-6">
                      <dl className="space-y-3 font-body text-sm text-charcoal/70">
                        <div className="flex justify-between gap-3">
                          <dt>Subtotal</dt>
                          <dd>₱{order.subtotal.toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>{order.shippingLabel || "Delivery"} fee</dt>
                          <dd>₱{order.deliveryFee.toFixed(2)}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <dt>Payment</dt>
                          <dd className="text-right">
                            <span className="block text-charcoal">
                              {formatPaymentMethod(order.paymentMethod)}
                            </span>
                            <span className="mt-0.5 block text-xs capitalize text-charcoal/50">
                              {order.paymentStatus}
                            </span>
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-center justify-between gap-3 border-t border-charcoal/10 pt-4">
                        <span className="font-body text-sm text-charcoal">
                          {paymentFailed || paymentPending
                            ? "Total Due"
                            : order.paymentStatus === "paid"
                              ? "Total paid"
                              : "Order total"}
                        </span>
                        <span className="font-display text-2xl text-charcoal">
                          ₱{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </section>

                  {order.orderStatus === "DELIVERED" && (
                    <div className="order-3 min-w-0 lg:order-none">
                      <OrderReviews
                        key={order.orderId}
                        orderId={order.orderId}
                      />
                    </div>
                  )}
                </div>
                <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
                  <section
                    className="order-2 min-w-0 rounded-2xl border border-charcoal/10 bg-sand/30 p-5 sm:p-6 lg:order-none"
                    aria-labelledby="order-progress-heading"
                  >
                    <div className="mb-6">
                      <h2
                        id="order-progress-heading"
                        className="font-display text-xl text-charcoal"
                      >
                        Order progress
                      </h2>
                      <p className="mt-2 font-body text-xs text-charcoal/50">
                        Follow your order from placement to delivery.
                      </p>
                    </div>
                    <OrderTracker
                      status={order.orderStatus}
                      paymentFailed={paymentFailed}
                      paymentPending={paymentPending}
                    />
                  </section>

                  <div className="order-4 min-w-0 lg:order-none">
                    <OrderReturnPanel
                      key={order.orderId}
                      orderId={order.orderId}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
    </main>
  );
}
