"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  RotateCcw,
  Mail,
  Package,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
export default function AdminAttention() {
  const [data, setData] = useState<Record<string, number> | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        const r = await fetch("/api/admin/attention", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const d = await r.json();
        setData(d);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Pending tasks unavailable.");
      }
    }
    void run();
    return () => controller.abort();
  }, [version]);
  const tasks = [
    {
      key: "requests",
      label: "Return / refund requests",
      href: "/admin/returns",
      icon: RotateCcw,
    },
    {
      key: "messages",
      label: "New messages",
      href: "/admin/contact",
      icon: Mail,
    },
    {
      key: "stock",
      label: "Low / out of stock",
      href: "/admin/products",
      icon: Package,
    },
    {
      key: "payments",
      label: "Payment issues",
      href: "/admin/orders",
      icon: CreditCard,
    },
  ];
  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-body text-sm font-medium text-charcoal">
            Attention needed
          </h2>
          <p className="mt-1 text-xs text-charcoal/50">
            Pending requests and store checks.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-sage hover:bg-sage/10"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tasks.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-xl border border-charcoal/10 p-3 transition-colors hover:border-sage/40 hover:bg-sage/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon size={17} className="text-sage" />
              <ArrowUpRight
                size={14}
                className="text-charcoal/30 group-hover:text-sage"
              />
            </div>
            <p className="font-body text-xs text-charcoal/60">{label}</p>
            <p
              className={
                data && data[key] > 0 && !error
                  ? "mt-1 font-display text-2xl text-charcoal"
                  : "mt-1 font-display text-2xl text-charcoal/40"
              }
            >
              {error ? "Unavailable" : data ? data[key] : "…"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
