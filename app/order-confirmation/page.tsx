"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
};

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in — bounce out, this page has nothing to show
      router.replace("/login");
      return;
    }

    if (!orderId) {
      setError(true);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    fetch(`/api/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: OrderDetails) => setOrder(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user, authLoading, orderId, router]);

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

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="font-body text-xs uppercase tracking-[0.25em] text-sage mb-4">
          Order Confirmed
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-4">
          Thank you for your order
        </h1>
        <p className="font-body text-sm text-charcoal/70 mb-2">
          Order #TA-{order.orderId}
        </p>
        <p className="font-body text-charcoal/70 leading-relaxed max-w-lg mx-auto mb-12">
          A confirmation email is on its way. We're preparing your tea now and
          will notify you once it ships.
        </p>

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
            <span>Total Paid</span>
            <span>₱{order.total.toFixed(2)}</span>
          </div>
        </div>

        <Link
          href="/shop"
          className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
        >
          Continue Shopping
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