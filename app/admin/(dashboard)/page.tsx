"use client";

import Link from "next/link";
import AdminAttention from "@/components/admin/AdminAttention";
import { useAuth } from "@/lib/auth-context";
import { AdminPage } from "@/components/admin/AdminPage";
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
import { useTheme } from "@/lib/theme-context";

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

type CustomerInsights = {
  purchasingCustomers: number;
  firstTimeBuyers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  averageSpendPerBuyer: number;
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
    return {
      label: "Out of Stock",
      bg: "bg-red-50",
      text: "text-red-600",
      dot: "bg-red-500",
    };
  }
  if (qty <= 10) {
    return {
      label: "Low Stock",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "In Stock",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [customerInsights, setCustomerInsights] =
    useState<CustomerInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const { user } = useAuth();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const chartTextColor = theme === "dark" ? "#d5ded4" : "#3a3a3a";
  const chartGridColor = theme === "dark" ? "#c9d3c833" : "#3a3a3a26";

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
          setCustomerInsights(data.customerInsights ?? null);
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
      bg: "bg-sage/15",
      iconColor: "text-sage",
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
      bg: "bg-green-100",
      iconColor: "text-green-700",
    },
    {
      label: "Products",
      value: stats ? Math.round(animatedProducts) : "—",
      icon: Package,
      bg: "bg-amber-100",
      iconColor: "text-amber-700",
    },
    {
      label: "Customers",
      value: stats ? Math.round(animatedCustomers) : "—",
      icon: Users,
      bg: "bg-sand",
      iconColor: "text-charcoal/70",
    },
  ];

  const customerCards = [
    {
      label: "Purchasing customers",
      value: customerInsights?.purchasingCustomers.toLocaleString("en-PH"),
      detail: customerInsights
        ? `${customerInsights.firstTimeBuyers.toLocaleString("en-PH")} first-time buyers`
        : "Customers with a paid order",
    },
    {
      label: "Returning customers",
      value: customerInsights?.returningCustomers.toLocaleString("en-PH"),
      detail: "Customers with 2+ paid orders",
    },
    {
      label: "Repeat purchase rate",
      value: customerInsights
        ? `${customerInsights.repeatPurchaseRate.toFixed(1)}%`
        : undefined,
      detail: "Returning customers ÷ purchasing customers",
    },
    {
      label: "Average spend per buyer",
      value: customerInsights
        ? `₱${customerInsights.averageSpendPerBuyer.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : undefined,
      detail: "Lifetime spend, including shipping",
    },
  ];

  return (
    <AdminPage>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="font-display text-3xl leading-tight text-charcoal sm:text-4xl">
            Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
            {user?.name || "Admin"}.
          </h1>
          <p className="mt-2 font-body text-sm leading-relaxed text-charcoal/60">
            Your store at a glance.
          </p>
        </header>
        <Link
          href="/admin/sales"
          className="rounded-full border border-sage/30 px-4 py-2 text-sm text-sage hover:bg-sage/10"
        >
          View sales reports
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              href={
                stat.label === "Products"
                  ? "/admin/products"
                  : stat.label === "Customers"
                    ? "/admin/customers"
                    : "/admin/orders"
              }
              key={stat.label}
              className="bg-white border border-charcoal/10 rounded-2xl p-5 transition-all duration-200   hover:border-sage/30 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-xs text-charcoal/50">
                  {stat.label}
                </span>
                <div
                  className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center`}
                >
                  <Icon
                    size={14}
                    className={stat.iconColor}
                    strokeWidth={1.75}
                  />
                </div>
              </div>
              <span className="font-display text-2xl text-charcoal">
                {isLoading ? "…" : stat.value}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <AdminAttention />
      </div>
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-4">
        <div className="bg-white border border-charcoal/10 rounded-2xl p-6 transition-all duration-200   hover:border-sage/30">
          <h2 className="font-body text-sm font-medium text-charcoal mb-6">
            Top Products by Revenue
          </h2>

          {isLoading && (
            <span className="font-body text-xs text-charcoal/40">
              Loading...
            </span>
          )}

          {!isLoading && topProducts.length === 0 && (
            <span className="font-body text-xs text-charcoal/40">
              Not enough sales data yet.
            </span>
          )}

          {/* Mobile / tablet: simple ranked list */}
          {!isLoading && topProducts.length > 0 && (
            <div className="lg:hidden space-y-1">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b-2 border-charcoal/10 last:border-0 px-2 -mx-2 py-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-display text-sm w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        index === 0
                          ? "bg-sage text-white"
                          : "bg-sage/10 text-sage"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-body text-sm text-charcoal">
                      {product.name}
                    </span>
                  </div>
                  <span className="font-body text-sm text-charcoal/70 shrink-0">
                    ₱
                    {product.revenue.toLocaleString("en-PH", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Desktop: bar chart */}
          {!isLoading && topProducts.length > 0 && (
            <div className="hidden lg:block">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={topProducts}
                  margin={{ top: 10, left: -10, right: 10, bottom: 10 }}
                  className="[&_*:focus]:outline-none"
                >
                  <CartesianGrid vertical={false} stroke={chartGridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: chartTextColor,
                      fontWeight: 600,
                    }}
                    axisLine={{ stroke: chartTextColor, strokeWidth: 1.5 }}
                    tickLine={false}
                    interval={0}
                    tickMargin={16}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: chartTextColor,
                      fontWeight: 600,
                    }}
                    axisLine={{ stroke: chartTextColor, strokeWidth: 1.5 }}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `${Math.round(value / 1000)}k`
                        : `${value}`
                    }
                    tickMargin={12}
                    width={45}
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
            </div>
          )}
        </div>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-6 transition-all duration-200   hover:border-sage/30">
          <h2 className="font-body text-sm font-medium text-charcoal mb-4">
            Concerning Stock
          </h2>

          {isLoading && (
            <span className="font-body text-xs text-charcoal/40">
              Loading...
            </span>
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
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}
                      />
                      {product.stockQuantity} left
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <section
        aria-labelledby="customer-insights-heading"
        aria-busy={isLoading}
        className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="customer-insights-heading"
            className="font-body text-sm font-medium text-charcoal"
          >
            Customer insights
          </h2>
          <p className="font-body text-xs text-charcoal/50">
            All time · Paid, non-cancelled orders · Before refunds
          </p>
        </div>
        {!isLoading && !customerInsights ? (
          <p role="status" className="mt-4 font-body text-sm text-charcoal/50">
            Customer insights are unavailable. Refresh to try again.
          </p>
        ) : (
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {customerCards.map((card) => (
              <div key={card.label} className="min-w-0">
                <dt className="font-body text-xs text-charcoal/50">
                  {card.label}
                </dt>
                <dd className="mt-2 font-display text-2xl tabular-nums text-charcoal break-words">
                  {isLoading ? "…" : card.value}
                </dd>
                <dd className="mt-2 font-body text-xs leading-relaxed text-charcoal/50">
                  {card.detail}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <p className="mt-6 font-body text-xs text-charcoal/50">
        Revenue and product performance include paid, non-cancelled orders
        before refunds. Revenue includes delivery fees; product revenue excludes
        them. Product count includes active products.
      </p>
    </AdminPage>
  );
}
