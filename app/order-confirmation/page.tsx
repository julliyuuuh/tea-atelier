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
  paymentStatus: "pending" | "paid" | "failed";
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
};

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { clearCart } = useCart();
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

    if (!orderId) {
      setError(true);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    let attempts = 0;
    const maxAttempts = 10; // ~20s of polling
    let cancelled = false;

    const poll = () => {
      fetch(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((data: OrderDetails) => {
          if (cancelled) return;
          setOrder(data);
          setLoading(false);

          const isCod = data.paymentMethod === "cod";

          // Clear cart once: immediately for COD, or once payment confirms paid for e-wallets
          if (!hasCleared.current && (isCod || data.paymentStatus === "paid")) {
            hasCleared.current = true;
            clearCart();
          }

          if (!isCod && data.paymentStatus === "pending" && attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 2000);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, orderId, router, clearCart]);

  if (authLoading || loading) {
    return <div className="py-24 text-center">Loading...</div>;
  }

  if (error || !order) {
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
  const isPendingPayment = !isCod && order.paymentStatus === "pending";
  const isFailedPayment = !isCod && order.paymentStatus === "failed";

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="font-body text-xs uppercase tracking-[0.25em] text-sage mb-4">
          {isPendingPayment ? "Confirming Payment" : isFailedPayment ? "Payment Failed" : "Order Confirmed"}
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-4">
          {isPendingPayment
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
              We're still waiting for confirmation from your payment provider.
              This usually takes a few seconds, this page will update
              automatically once it's confirmed. No need to refresh.
            </p>
          </div>
        )}

        {isFailedPayment && (
          <div className="max-w-lg mx-auto mb-8 rounded-xl border border-red-300 bg-red-50 px-6 py-4">
            <p className="font-body text-sm text-charcoal/80">
              Your payment didn't go through, so this order hasn't been
              placed. Your cart items are still saved, you can try checking
              out again.
            </p>
          </div>
        )}

        {!isPendingPayment && !isFailedPayment && (
          <p className="font-body text-charcoal/70 leading-relaxed max-w-lg mx-auto mb-12">
            A confirmation email is on its way. We're preparing your tea now
            and will notify you once it ships.
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
            <span>{isPendingPayment ? "Total Due" : "Total Paid"}</span>
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