"use client";
import ValidatedForm from "@/components/ValidatedForm";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminAttention from "@/components/admin/AdminAttention";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { loadSales } from "@/lib/admin-sales";
type Report = Awaited<ReturnType<typeof loadSales>>;
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const money = (v: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    v,
  );
export default function AdminSalesPanel() {
  const { user } = useAuth();
  const [from, setFrom] = useState(today),
    [to, setTo] = useState(today),
    [range, setRange] = useState({ from: today(), to: today() }),
    [data, setData] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [printing, setPrinting] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(
          `/api/admin/sales?${new URLSearchParams(range)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          },
        );
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load sales.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void run();
    return () => controller.abort();
  }, [range, version]);
  function preset(kind: string) {
    let start = today(),
      end = start;
    const date = new Date(start + "T00:00:00Z");
    if (kind === "Yesterday") {
      date.setUTCDate(date.getUTCDate() - 1);
      start = end = date.toISOString().slice(0, 10);
    }
    if (kind === "This week") {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      start = date.toISOString().slice(0, 10);
    }
    if (kind === "This month") start = start.slice(0, 8) + "01";
    setFrom(start);
    setTo(end);
    setRange({ from: start, to: end });
  }
  async function print() {
    if (!data) return;
    const win = window.open("about:blank", "_blank");
    if (!win) {
      setError("Allow popups to open the printable report.");
      return;
    }
    win.opener = null;
    setPrinting(true);
    try {
      const r = await fetch(
        `/api/admin/sales?${new URLSearchParams({ from: data.from, to: data.to, format: "print" })}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!r.ok) throw Error("Unable to generate report.");
      const html = await r.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      win.close();
      setError(e instanceof Error ? e.message : "Unable to print.");
    } finally {
      setPrinting(false);
    }
  }
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return (
    <section className="mb-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">
          Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
          {user?.firstName || "Admin"}.
        </h2>
        <Link className="text-sage underline" href="/admin/profile">
          My profile
        </Link>
      </div>
      <div className="rounded-2xl border border-sage/25 p-5">
        <h3 className="font-display text-xl">Sales report</h3>
        <p className="my-2 text-sm text-charcoal/60">
          Paid/refunded orders by placement date, Manila time. Completed refunds
          for those orders are included as of now. Paid cancelled orders remain
          included. Unpaid orders are excluded.
        </p>
        <ValidatedForm
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setRange({ from, to });
          }}
        >
          <label className="text-sm">
            From
            <input
              className="block rounded-lg border border-sage/40 bg-transparent p-2"
              type="date"
              required
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            To
            <input
              className="block rounded-lg border border-sage/40 bg-transparent p-2"
              type="date"
              required
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="rounded-xl bg-sage px-4 py-2 text-cream">
            Apply dates
          </button>
          <button
            type="button"
            className="rounded-xl border border-sage/40 px-4 py-2"
            onClick={() => setVersion((v) => v + 1)}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={loading || !!error || !data || printing}
            onClick={() => void print()}
            className="rounded-xl border border-sage/40 px-4 py-2 disabled:opacity-40"
          >
            {printing ? "Preparing…" : "Print / Save PDF"}
          </button>
        </ValidatedForm>
        <div className="my-3 flex flex-wrap gap-3">
          {["Today", "Yesterday", "This week", "This month"].map((p) => (
            <button
              key={p}
              onClick={() => preset(p)}
              className="rounded-full border border-sage/25 px-3 py-1 text-sm"
            >
              {p}
            </button>
          ))}
        </div>
        {loading ? (
          <p role="status">Loading sales…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          data && (
            <>
              <p className="text-sm">
                {data.from} to {data.to} · PayMongo configuration:{" "}
                {data.paymongoMode}. Historical mode is not recorded per order;
                figures may include sandbox transactions.
              </p>
              <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Paid orders", data.orders.length],
                  ["Gross collected", money(data.gross)],
                  ["Completed refunds", money(data.refunds)],
                  ["Net after refunds", money(data.net)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-sage/10 p-3">
                    <p className="text-xs">{label}</p>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                Merchandise: {money(data.merchandise)} · Shipping:{" "}
                {money(data.shipping)}
              </p>
              <div className="my-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis width={70} />
                    <Tooltip />
                    <Bar dataKey="net" name="Net sales (PHP)" fill="#778873" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h4 className="mt-4 font-medium">Item sales before refunds</h4>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units</th>
                      <th>Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p) => (
                      <tr key={p.product_id}>
                        <td>{p.product_name}</td>
                        <td>{p.units}</td>
                        <td>{money(p.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="my-3 text-sm">
                Payment methods (gross):{" "}
                {Object.entries(data.methods)
                  .map(([method, value]) => `${method}: ${money(value)}`)
                  .join(" · ") || "No sales"}
              </p>
              {!data.orders.length && <p>No paid sales in this period.</p>}
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Payment</th>
                      <th>Gross</th>
                      <th>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.order_id} className="border-t border-sage/20">
                        <td className="py-2">
                          <Link
                            href="/admin/orders"
                            className="text-sage underline"
                          >
                            TA-{o.order_id}
                          </Link>
                        </td>
                        <td>{o.payment_method}</td>
                        <td>{money(o.total)}</td>
                        <td>{money(o.refund)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          ["Review returns / refunds", "/admin/returns"],
          ["Customer messages", "/admin/contact"],
          ["Manage orders", "/admin/orders"],
          ["Review inventory", "/admin/products"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-sage/30 px-4 py-3 text-sage hover:bg-sage/10"
          >
            {label}
          </Link>
        ))}
      </div>
      <AdminAttention />
      <h2 className="font-display text-xl">All-time store overview</h2>
    </section>
  );
}
