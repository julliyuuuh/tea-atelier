"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type OrderItem = {
  name: string;
  image: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  paymentMethod: string;
  recipientName: string | null;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cod: "Cash on Delivery",
    gcash: "GCash",
    credit: "Credit Card",
    paypal: "PayPal",
  };
  return labels[method] || method;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Please sign in to view your orders.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load orders.");
        setOrders(data.orders);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <section className="max-w-5xl mx-auto px-6 md:px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-10">
          My Orders
        </h1>

        {isLoading && <p className="font-body text-sm text-charcoal/60">Loading orders...</p>}
        {!isLoading && errorMessage && (
          <p className="font-body text-sm text-red-600">{errorMessage}</p>
        )}
        {!isLoading && !errorMessage && orders.length === 0 && (
          <p className="font-body text-sm text-charcoal/60">
            You haven't placed any orders yet.
          </p>
        )}

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-charcoal/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-charcoal/10">
                <div>
                  <p className="font-body text-sm text-charcoal">
                    Order #TA-{order.id}
                  </p>
                    <p className="font-body text-xs text-charcoal/50 mt-1">
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
                <span className="font-body text-xs uppercase tracking-wide px-3 py-1 bg-sage/15 text-sage">
                  {order.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sand overflow-hidden shrink-0">
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

              <div className="flex justify-between font-body text-sm text-charcoal/70 pt-4 border-t border-charcoal/10">
                <span>Total ({formatPaymentMethod(order.paymentMethod)})</span>
                <span className="font-display text-base text-charcoal">
                  ₱{order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}