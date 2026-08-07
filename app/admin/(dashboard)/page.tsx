"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, DollarSign, Package, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TopProduct = {
  id: number;
  name: string;
  revenue: number;
  unitsSold: number;
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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
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

      <div className="mt-10 grid grid-cols-2 gap-4">
        <div className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h2 className="font-body text-sm font-medium text-charcoal mb-4">
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts} margin={{ top: 10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#3a3a3a99" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [
                    `₱${Number(value).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}`,
                    "Revenue",
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={36}>
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
      </div>
    </div>
  );
}