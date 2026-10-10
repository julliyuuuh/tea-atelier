"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

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
  paymentMethod: string;
  fulfillmentOnHold?: boolean;
  paymentStatus: "pending" | "processing" | "paid" | "failed" | "cancelled";
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
};

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { refreshCart } = useCart();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasCleared = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!orderId) return;

    const token = localStorage.getItem("token");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let receivedOrder = false;
    hasCleared.current = false;

    const poll = async () => {
      if (controller.signal.aborted) return;
      try {
        // Periodically reconcile a captured payment whose webhook finalization
        // was interrupted. This endpoint never initiates another charge.
        if (attempts > 0 && attempts % 5 === 0) {
          await fetch("/api/payments/paymongo/check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ orderId: Number(orderId) }),
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          }).catch(() => undefined);
        }
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (!response.ok) throw new Error("Order unavailable");
        const data: OrderDetails = await response.json();
        if (controller.signal.aborted) return;
        receivedOrder = true;
        setOrder(data);
        setError(false);
        setLoading(false);
        const isCod = data.paymentMethod === "cod";
        if (!hasCleared.current && (isCod || data.paymentStatus === "paid")) {
          hasCleared.current = true;
          refreshCart();
        }
        if (
          data.orderStatus === "CANCELLED" ||
          isCod ||
          !["pending", "processing"].includes(data.paymentStatus)
        )
          return;
      } catch {
        if (controller.signal.aborted) return;
        if (!receivedOrder && attempts >= 3) {
          setError(true);
          setLoading(false);
          return;
        }
      }
      attempts++;
      if (attempts < 40) timer = setTimeout(poll, attempts < 10 ? 2000 : 5000);
    };
    void poll();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [user, authLoading, orderId, router, refreshCart]);

  if (orderId && (authLoading || loading)) {
    return <div className="py-24 text-center">Loading...</div>;
  }

  if (!orderId || error || !order) {
    return (
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-24 text-center">
        <p className="font-body text-charcoal/70 mb-8">
          We couldn&apos;t find that order.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  const isCod = order.paymentMethod === "cod";
  const isCancelled =
    order.orderStatus === "CANCELLED" || order.paymentStatus === "cancelled";
  const isPendingPayment =
    !isCancelled &&
    !isCod &&
    (order.paymentStatus === "pending" || order.paymentStatus === "processing");
  const isFailedPayment =
    !isCancelled && !isCod && order.paymentStatus === "failed";

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="font-body text-xs uppercase tracking-[0.25em] text-sage mb-4">
          {isCancelled
            ? "Order Cancelled"
            : isPendingPayment
              ? "Confirming Payment"
              : isFailedPayment
                ? "Payment Failed"
                : "Order Confirmed"}
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-4">
          {isCancelled
            ? "This order was cancelled"
            : isPendingPayment
              ? "Confirming your payment..."
              : isFailedPayment
                ? "We couldn't confirm your payment"
                : "Thank you for your order"}
        </h1>
        <p className="font-body text-sm text-charcoal/70 mb-2">
          Order #TA-{order.orderId}
        </p>

        {isPendingPayment && (
          <div className="max-w-lg mx-auto mb-8 rounded-xl border border-sage/30 bg-sage/10 px-6 py-4">
            <p className="font-body text-sm text-charcoal/80">
              We&apos;re still waiting for confirmation from your payment
              provider. This page checks automatically for a few minutes. If
              confirmation takes longer, check again or view the order in My
              Orders. Please avoid starting another payment while this one is
              unresolved.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 underline font-body text-sm"
            >
              Check again
            </button>
            <Link
              href={`/account/orders/${order.orderId}`}
              className="ml-4 underline font-body text-sm"
            >
              View order
            </Link>
          </div>
        )}

        {isFailedPayment && (
          <div className="max-w-lg mx-auto mb-8 rounded-xl border border-red-300 bg-red-50 px-6 py-4">
            <p className="font-body text-sm text-charcoal/80">
              Your payment did not go through. Your order is saved for another
              attempt. Your cart items are still saved, you can try checking out
              again.
            </p>
          </div>
        )}

        {!isCancelled && !isPendingPayment && !isFailedPayment && (
          <p className="font-body text-charcoal/70 leading-relaxed max-w-lg mx-auto mb-12">
            {order.fulfillmentOnHold
              ? "Your payment was received, but your order needs a stock review. Our team will contact you about available items and refund options."
              : "Your order is confirmed. We will notify you once it ships."}
          </p>
        )}

        <div className="bg-sand/40 border border-charcoal/10 p-8 max-w-sm mx-auto text-left mb-12">
          {order.recipientName && (
            <div className="flex justify-between font-display text-lg text-charcoal border-b border-charcoal/10 pb-3 mb-3">
              <span>Recipient</span>
              <span>{order.recipientName}</span>
            </div>
          )}
          <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
            <span>Subtotal</span>
            <span>₱{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
            <span>Delivery Fee</span>
            <span>₱{order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-display text-lg text-charcoal border-t border-charcoal/10 pt-3">
            <span>
              {order.paymentStatus === "paid" ? "Total Paid" : "Total Due"}
            </span>
            <span>₱{order.total.toFixed(2)}</span>
          </div>
        </div>

        <Link
          href={isFailedPayment ? "/checkout" : "/shop"}
          className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
        >
          {isFailedPayment ? "Return to Checkout" : "Continue Shopping"}
        </Link>
      </motion.div>
    </section>
  );
}

export default function OrderConfirmationPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <Suspense fallback={<div className="py-24 text-center">Loading...</div>}>
        <OrderConfirmationContent />
      </Suspense>
      <Footer />
    </main>
  );
}
