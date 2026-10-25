"use client";
import ValidatedForm from "@/components/ValidatedForm";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, RefreshCw, ShoppingBag } from "lucide-react";
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
  return (
    <section className="mb-8 space-y-5">
      <div className="rounded-2xl border border-charcoal/10 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-charcoal/50">
              Select your reporting period. Dates use Manila time.
            </p>
          </div>
          <button
            type="button"
            disabled={loading || !!error || !data || printing}
            onClick={() => void print()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-charcoal/20 px-4 py-2 text-sm hover:bg-sage/10 disabled:cursor-default disabled:opacity-40"
          >
            <Printer size={16} />
            {printing ? "Preparing…" : "Print / Save PDF"}
          </button>
        </div>
        <ValidatedForm
          className="grid grid-cols-2 items-start gap-3 rounded-xl bg-sage/5 p-3 sm:flex sm:flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            setRange({ from, to });
          }}
        >
          <label className="min-w-0 flex-1 text-xs text-charcoal/60 sm:flex-none">
            From
            <input
              className="mt-1 block h-10 w-full rounded-lg border border-charcoal/20 bg-transparent px-3 text-sm text-charcoal sm:w-40"
              type="date"
              required
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="min-w-0 flex-1 text-xs text-charcoal/60 sm:flex-none">
            To
            <input
              className="mt-1 block h-10 w-full rounded-lg border border-charcoal/20 bg-transparent px-3 text-sm text-charcoal sm:w-40"
              type="date"
              required
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <div className="col-span-2 flex items-center gap-3 sm:pt-5">
            <button className="h-10 cursor-pointer rounded-full bg-sage px-5 text-sm text-cream">
              Apply dates
            </button>
            <button
              type="button"
              aria-label="Refresh sales report"
              title="Refresh sales report"
              onClick={() => setVersion((v) => v + 1)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-charcoal/20 hover:bg-sage/10"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </ValidatedForm>
        <div className="my-4 flex flex-wrap items-center gap-2">
          {["Today", "Yesterday", "This week", "This month"].map((p) => (
            <button
              key={p}
              onClick={() => preset(p)}
              className="cursor-pointer rounded-full border border-charcoal/10 px-3 py-1.5 text-xs text-charcoal/70 hover:border-sage hover:bg-sage/10"
            >
              {p}
            </button>
          ))}
        </div>
        {loading ? (
          <p
            role="status"
            className="py-8 text-center text-sm text-charcoal/50"
          >
            Loading sales…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        ) : (
          data && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal/50">
                <span>
                  {new Date(data.from + "T00:00:00+08:00").toLocaleDateString(
                    "en-PH",
                    {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}{" "}
                  –{" "}
                  {new Date(data.to + "T00:00:00+08:00").toLocaleDateString(
                    "en-PH",
                    {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </span>
                <span className="rounded-full bg-sage/10 px-3 py-1">
                  PayMongo{" "}
                  {data.paymongoMode === "test"
                    ? "test mode"
                    : "mode unverified"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Paid orders", data.orders.length],
                  ["Gross collected", money(data.gross)],
                  ["Completed refunds", money(data.refunds)],
                  ["Net after refunds", money(data.net)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-sage/10 p-4">
                    <p className="mb-1 text-xs text-charcoal/60">{label}</p>
                    <p className="font-display text-xl sm:text-2xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-charcoal/50">
                <span>Merchandise {money(data.merchandise)}</span>
                <span>Shipping {money(data.shipping)}</span>
              </div>
              {data.orders.length > 0 ? (
                <>
                  <h3 className="mb-2 mt-6 text-sm font-medium">
                    Net sales by day
                  </h3>
                  <div className="h-44 sm:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.daily}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis width={65} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="net"
                          name="Net sales (PHP)"
                          fill="#778873"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-4 border-t border-charcoal/10 pt-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      View orders and item sales ({data.orders.length} orders)
                    </summary>
                    <h4 className="mb-2 mt-4 text-sm text-charcoal/60">
                      Item sales before refunds
                    </h4>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="py-2">Product</th>
                            <th>Units</th>
                            <th>Gross</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.products.map((p) => (
                            <tr
                              key={p.product_id}
                              className="border-t border-charcoal/10"
                            >
                              <td className="py-2">{p.product_name}</td>
                              <td>{p.units}</td>
                              <td>{money(p.gross)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="my-4 text-xs text-charcoal/50">
                      Payment methods (gross):{" "}
                      {Object.entries(data.methods)
                        .map(([m, v]) => m + ": " + money(v))
                        .join(" · ")}
                    </p>
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="py-2">Order</th>
                            <th>Payment</th>
                            <th>Gross</th>
                            <th>Refund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.orders.map((o) => (
                            <tr
                              key={o.order_id}
                              className="border-t border-charcoal/10"
                            >
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
                  </details>
                </>
              ) : (
                <div className="my-5 rounded-xl border border-dashed border-sage/30 px-4 py-8 text-center">
                  <ShoppingBag size={24} className="mx-auto mb-3 text-sage" />
                  <h3 className="font-display text-xl">
                    No sales in this period
                  </h3>
                  <p className="mt-1 text-sm text-charcoal/50">
                    Try another date range to view paid orders and their sales.
                  </p>
                </div>
              )}
              <details className="mt-4 border-t border-charcoal/10 pt-3 text-xs text-charcoal/50">
                <summary className="cursor-pointer">
                  How these figures are calculated
                </summary>
                <p className="mt-2 leading-relaxed">
                  Paid/refunded orders by placement date, Manila time. Paid
                  cancelled orders are included; unpaid orders are excluded.
                  Completed refunds for those orders are included as of now,
                  even if completed after the selected period. Historical
                  payment mode is not recorded per order, so figures may include
                  sandbox transactions.
                </p>
              </details>
            </>
          )
        )}
      </div>
    </section>
  );
}
