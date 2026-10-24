"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  return (
    <section className="rounded-2xl border border-sage/25 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl">Attention needed</h3>
        <button
          className="cursor-pointer text-sm text-sage"
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      <p className="mb-3 text-xs text-charcoal/60">
        Current store tasks, independent of the sales date range.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["requests", "Return / refund requests", "/admin/returns"],
          ["messages", "New messages", "/admin/contact"],
          ["stock", "Low / out of stock", "/admin/products"],
          ["payments", "Payment issues", "/admin/orders"],
        ].map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            className="rounded-xl bg-sage/10 p-3 hover:bg-sage/20"
          >
            <p className="text-sm">{label}</p>
            <strong>
              {error ? "Unavailable" : data ? data[key] : "Loading…"}
            </strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
