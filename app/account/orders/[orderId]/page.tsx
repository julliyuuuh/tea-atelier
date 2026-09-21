"use client";

// Save as: app/account/orders/[orderId]/page.tsx

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
// import Badge from wherever your Badge component lives

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
  total: number;
  items: OrderItem[];
};

// ---------- helpers ----------

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cod: "Cash on Delivery",
    gcash: "GCash",
    credit: "Credit Card",
    paypal: "PayPal",
  };
  return labels[method] || method;
}

const TRACKING_STEPS = [
  { key: "placed", label: "Order Placed", description: "We've received your order.", icon: ClipboardList },
  { key: "processing", label: "Processing", description: "Your tea is being packed.", icon: Package },
  { key: "shipped", label: "Shipped", description: "On its way to you.", icon: Truck },
  { key: "delivered", label: "Delivered", description: "Enjoy your tea!", icon: PackageCheck },
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

function OrderTracker({ status }: { status: string }) {
  if (status.toLowerCase() === "cancelled") {
    return (
      <div className="rounded-xl bg-red-50 p-4">
        <p className="font-body text-sm text-red-600">This order was cancelled.</p>
      </div>
    );
  }

  const current = getStepIndex(status);
  const lastIndex = TRACKING_STEPS.length - 1;

  return (
    <ol className="relative">
      {TRACKING_STEPS.map((step, i) => {
        const done = i < current || current === lastIndex;
        const active = i === current && !done;
        const Icon = step.icon;
        const isLast = i === lastIndex;

        return (
          <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
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
              {done ? <Check size={16} /> : <Icon size={16} strokeWidth={1.5} />}
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
    <main className="mx-auto max-w-2xl px-4 py-10">
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

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* header */}
          <div className="bg-sand/30 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-charcoal">
                  Order #TA-{order.orderId}
                </p>
                <p className="font-body text-xs text-charcoal/50 mt-1">
                  Placed on{" "}
                  {new Date(order.createdAt).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {order.recipientName && (
                  <p className="font-body text-xs text-charcoal/50 mt-1">
                    For: {order.recipientName}
                  </p>
                )}
              </div>
              <Badge tone="sage">{getStatusLabel(order.orderStatus)}</Badge>
            </div>
          </div>

          {/* tracking */}
          <div className="bg-sand/30 rounded-xl p-6">
            <h3 className="font-display text-base text-charcoal mb-6">
              Order Progress
            </h3>
            <OrderTracker status={order.orderStatus} />
          </div>

          {/* items + summary */}
          <div className="bg-sand/30 rounded-xl p-6">
            <h3 className="font-display text-base text-charcoal mb-4">Items</h3>
            <div className="space-y-3 mb-4 pb-4 border-b border-charcoal/10">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sand rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-sm text-charcoal">{item.name}</p>
                    <p className="font-body text-xs text-charcoal/50">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-body text-sm text-charcoal">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 font-body text-sm text-charcoal/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span>₱{order.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment</span>
                <span>
                  {formatPaymentMethod(order.paymentMethod)} · {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-charcoal/10">
                <span className="text-charcoal">Total</span>
                <span className="font-display text-base text-charcoal">
                  ₱{order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}