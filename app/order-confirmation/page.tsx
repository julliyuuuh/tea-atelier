"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const subtotal = parseFloat(searchParams.get("subtotal") || "0");
  const deliveryFee = parseFloat(searchParams.get("delivery") || "0");
  const total = parseFloat(searchParams.get("total") || "0");
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    setOrderNumber(`TA-₱{Math.floor(100000 + Math.random() * 900000)}`);
  }, []);

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
          Order #{orderNumber}
        </p>
        <p className="font-body text-charcoal/70 leading-relaxed max-w-lg mx-auto mb-12">
          A confirmation email is on its way. We're preparing your tea now and
          will notify you once it ships.
        </p>

        <div className="bg-sand/40 border border-charcoal/10 p-8 max-w-sm mx-auto text-left mb-12">
          <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
            <span>Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-body text-sm text-charcoal/70 mb-3">
            <span>Delivery Fee</span>
            <span>₱{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-display text-lg text-charcoal border-t border-charcoal/10 pt-3">
            <span>Total Paid</span>
            <span>₱{total.toFixed(2)}</span>
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