"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, DollarSign, Package, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

type TopProduct = {
  id: number;
  name: string;
  revenue: number;
  unitsSold: number;
};

type LowStockProduct = {
  id: number;
  name: string;
  stockQuantity: number;
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

    const targetValue = target;
    const startTime = performance.now();
    const startValue = 0;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + (targetValue - startValue) * eased);

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

function stockBadge(qty: number) {
  if (qty === 0) {
    return { label: "Out of Stock", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
  }
  if (qty <= 10) {
    return { label: "Low Stock", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  }
  return { label: "In Stock", bg: "bg-sage/15", text: "text-sage", dot: "bg-sage" };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
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
          setTopProducts(data.topProducts);
          setLowStock(data.lowStock);
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
      value: stats
        ? `₱${animatedRevenue.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "—",
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

      <div className="mt-10 grid grid-cols-[65%_1fr] gap-4">
        <div className="bg-white border border-charcoal/10 rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-charcoal/5 hover:border-sage/30">
          <h2 className="font-body text-sm font-medium text-charcoal mb-6">
            Top Products by Revenue
          </h2>

          {isLoading && (
            <span className="font-body text-xs text-charcoal/40">Loading...</span>
          )}

          {!isLoading && topProducts.length === 0 && (
            <span className="font-body text-xs text-charcoal/40">
              Not enough sales data yet.
            </span>
          )}

          {!isLoading && topProducts.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topProducts}
                margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
                className="[&_*:focus]:outline-none"
              >
              <CartesianGrid vertical={false} stroke="#3a3a3a26" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#3a3a3a", fontWeight: 600 }}
                axisLine={{ stroke: "#3a3a3a", strokeWidth: 1.5 }}
                tickLine={false}
                interval={0}
                tickMargin={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#3a3a3a", fontWeight: 600 }}
                axisLine={{ stroke: "#3a3a3a", strokeWidth: 1.5 }}
                tickLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`
                }
                tickMargin={12}
                width={50}
              />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={55}>
                  {topProducts.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={index === 0 ? "#7a9b76" : "#7a9b7655"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-charcoal/10 rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-charcoal/5 hover:border-sage/30">
          <h2 className="font-body text-sm font-medium text-charcoal mb-4">
            Low Stock
          </h2>

          {isLoading && (
            <span className="font-body text-xs text-charcoal/40">Loading...</span>
          )}

          {!isLoading && lowStock.length === 0 && (
            <span className="font-body text-xs text-charcoal/40">
              No products found.
            </span>
          )}

          {!isLoading && lowStock.length > 0 && (
            <div className="space-y-1">
              {lowStock.map((product) => {
                const badge = stockBadge(product.stockQuantity);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b-2 border-charcoal/10 last:border-0 px-2 -mx-2 py-3 rounded-lg"
                  >
                    <span className="font-body text-sm text-charcoal">
                      {product.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {product.stockQuantity} left
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}