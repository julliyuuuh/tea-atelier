"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, DollarSign, Package, Users } from "lucide-react";

type RecentOrder = {
  id: number;
  recipientName: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
};

type Stats = {
  totalOrders: number;
  revenue: number;
  totalProducts: number;
  totalCustomers: number;
};

function useCountUp(target: number | null, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;

    const startTime = performance.now();
    const startValue = 0;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out for a nicer finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + (target - startValue) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/admin/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
        }
      } catch {
        // fail silently
      } finally {
        setIsLoading(false);
      }
    }
    loadOverview();
  }, []);

  const animatedOrders = useCountUp(stats ? stats.totalOrders : null);
  const animatedRevenue = useCountUp(stats ? stats.revenue : null);
  const animatedProducts = useCountUp(stats ? stats.totalProducts : null);
  const animatedCustomers = useCountUp(stats ? stats.totalCustomers : null);

  const statCards = [
    {
      label: "Total Orders",
      value: stats ? Math.round(animatedOrders) : "—",
      icon: ShoppingBag,
    },
    {
      label: "Revenue",
      value: stats ? `₱${animatedRevenue.toFixed(2)}` : "—",
      icon: DollarSign,
    },
    {
      label: "Products",
      value: stats ? Math.round(animatedProducts) : "—",
      icon: Package,
    },
    {
      label: "Customers",
      value: stats ? Math.round(animatedCustomers) : "—",
      icon: Users,
    },
  ];

  return (
    <div className="p-10">
      <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
        Overview
      </h1>
      <p className="font-body text-sm text-charcoal/60 mb-8">
        Welcome back — here's what's happening with Tea Atelier.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-charcoal/10 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-charcoal/5 hover:border-sage/30 cursor-default"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-xs text-charcoal/50">
                  {stat.label}
                </span>
                <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center">
                  <Icon size={14} className="text-sage" strokeWidth={1.75} />
                </div>
              </div>
              <span className="font-display text-2xl text-charcoal">
                {isLoading ? "…" : stat.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-10 bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-body text-sm font-medium text-charcoal mb-4">
          Recent Orders
        </h2>

        {isLoading && (
          <span className="font-body text-xs text-charcoal/40">Loading...</span>
        )}

        {!isLoading && recentOrders.length === 0 && (
          <span className="font-body text-xs text-charcoal/40">
            No orders yet.
          </span>
        )}

        {!isLoading && recentOrders.length > 0 && (
          <div className="space-y-1">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border-b border-charcoal/5 last:border-0 px-2 -mx-2 py-3 rounded-lg transition-colors duration-150 hover:bg-sage/5 cursor-pointer"
              >
                <div>
                  <p className="font-body text-sm text-charcoal">
                    Order #TA-{order.id}
                  </p>
                  <p className="font-body text-xs text-charcoal/50 mt-0.5">
                    {order.recipientName || "—"} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-body text-sm text-charcoal">
                    ₱{order.totalAmount.toFixed(2)}
                  </p>
                  <span className="font-body text-xs text-charcoal/50 uppercase tracking-wide">
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}