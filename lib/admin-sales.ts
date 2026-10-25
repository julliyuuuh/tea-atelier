import { pool } from "@/lib/db";
export function salesDates(url: URL) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const from = url.searchParams.get("from") || today;
  const to = url.searchParams.get("to") || today;
  for (const value of [from, to]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw Error("Choose valid dates.");
  }
  if (from > to) throw Error("The start date must be before the end date.");
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 365)
    throw Error("Choose a range of up to 366 days.");
  return { from, to };
}
export async function loadSales(from: string, to: string) {
  // The cohort is based on order placement in Manila, not a payment settlement ledger.
  // Successful refunds remain attached to their original order cohort.
  const result = await pool.query(
    `WITH refunds AS (
    SELECT r.order_id, SUM(a.amount_cents)/100.0 AS refunded FROM order_returns r
    JOIN return_refund_attempts a ON a.return_id=r.return_id AND a.state='SUCCEEDED' GROUP BY r.order_id
  ) SELECT o.order_id, (o.created_at AT TIME ZONE 'UTC') AS created_at, o.payment_method, o.payment_status, o.order_status,
    o.total_amount::text, o.shipping_cost::text, COALESCE(r.refunded,0)::text AS refunded,
    COALESCE((SELECT SUM(i.quantity) FROM order_items i WHERE i.order_id=o.order_id),0)::int AS units
    FROM orders o LEFT JOIN refunds r ON r.order_id=o.order_id
    WHERE o.created_at >= (($1::date::timestamp AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'UTC')
      AND o.created_at < ((($2::date+1)::timestamp AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'UTC')
      AND o.payment_status IN ('paid','refunded')
    ORDER BY o.created_at,o.order_id`,
    [from, to],
  );
  const productResult = await pool.query(
    `SELECT p.product_id,p.product_name,SUM(i.quantity)::int AS units,SUM(i.quantity*i.price)::text AS gross
    FROM order_items i JOIN orders o ON o.order_id=i.order_id JOIN products p ON p.product_id=i.product_id
    WHERE o.created_at >= (($1::date::timestamp AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'UTC')
      AND o.created_at < ((($2::date+1)::timestamp AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'UTC')
      AND o.payment_status IN ('paid','refunded')
    GROUP BY p.product_id,p.product_name ORDER BY SUM(i.quantity*i.price) DESC,p.product_id`,
    [from, to],
  );
  const products = productResult.rows.map((p) => ({
    ...p,
    gross: Number(p.gross),
  }));
  const orders = result.rows.map((o) => ({
    ...o,
    total: Number(o.total_amount),
    shipping: Number(o.shipping_cost),
    refund: Number(o.refunded),
  }));
  const gross = orders.reduce((s, o) => s + Math.round(o.total * 100), 0) / 100,
    shipping =
      orders.reduce((s, o) => s + Math.round(o.shipping * 100), 0) / 100,
    refunds = orders.reduce((s, o) => s + Math.round(o.refund * 100), 0) / 100;
  const daily: Record<string, number> = {};
  for (let day = Date.parse(from); day <= Date.parse(to); day += 86400000)
    daily[new Date(day).toISOString().slice(0, 10)] = 0;
  const methods: Record<string, number> = {};
  for (const o of orders) {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(o.created_at));
    daily[day] = (daily[day] || 0) + o.total - o.refund;
    methods[o.payment_method] = (methods[o.payment_method] || 0) + o.total;
  }
  return {
    from,
    to,
    orders,
    products,
    gross,
    shipping,
    refunds,
    net: Math.round((gross - refunds) * 100) / 100,
    merchandise: Math.round((gross - shipping) * 100) / 100,
    daily: Object.entries(daily).map(([date, net]) => ({
      date,
      net: Math.round(net * 100) / 100,
    })),
    methods,
    paymongoMode: process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "unverified",
  };
}
const escape = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function salesDocument(data: Awaited<ReturnType<typeof loadSales>>) {
  const money = (n: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(n);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tea Atelier · Sales Report ${escape(data.from)} to ${escape(data.to)}</title>
<style>
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #fdf6ed; color: #1f2621; font: 14px/1.5 Arial, sans-serif; }
.toolbar { padding: 16px; text-align: center; }
button { padding: 10px 18px; border: 0; border-radius: 8px; background: #1f2621; color: white; cursor: pointer; font: inherit; }
.sheet { max-width: 900px; margin: 0 auto 32px; padding: 40px; background: white; }
header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
h1 { font: 32px Georgia, serif; margin: 0; } h2 { font-size: 20px; margin: 0 0 8px; } h3 { margin: 24px 0 12px; font-size: 14px; }
.meta { text-align: right; } .notice { color: #666; font-size: 12px; }
.summary { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 24px 0; }
.summary p { margin: 0; padding: 12px; background: #f5f5f2; } .summary span { display: block; color: #666; font-size: 12px; } .summary strong { font-size: 18px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 24px; }
th,td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #ddd; vertical-align: top; overflow-wrap: anywhere; }
th { background: #f5f5f2; font-size: 12px; } .number { text-align: right; }
footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 16px; }
thead { display: table-header-group; } tr,.summary,footer { break-inside: avoid; }
@media(max-width:600px) { .sheet { padding: 20px; } header { flex-direction: column; } .meta { text-align: left; } }
@media print { body { background: white; color: black; } .toolbar { display: none; } .sheet { max-width: none; margin: 0; padding: 0; } header { flex-direction: row; } .meta { text-align: right; } }
</style></head><body>
<div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button><p class="notice">Choose “Save as PDF” as the printer to export this document.</p></div>
<main class="sheet"><header><div><h1>Tea Atelier</h1><p>Where every leaf tells a story</p></div><div class="meta"><h2>Sales Report</h2><div>${escape(data.from)} to ${escape(data.to)}</div><div class="notice">Manila time · ${data.orders.length} paid/refunded orders</div></div></header>
<div class="summary">${[
    ["Gross collected", money(data.gross)],
    ["Completed refunds", money(data.refunds)],
    ["Net after refunds", money(data.net)],
    ["Shipping collected", money(data.shipping)],
  ]
    .map(
      ([label, value]) =>
        `<p><span>${label}</span><strong>${value}</strong></p>`,
    )
    .join("")}</div>
<p>Merchandise before refunds: <strong>${money(data.merchandise)}</strong></p>
<h3>Item sales before refunds</h3><table><thead><tr><th>Product</th><th class="number">Units</th><th class="number">Gross</th></tr></thead><tbody>${data.products.map((p) => `<tr><td>${escape(p.product_name)}</td><td class="number">${p.units}</td><td class="number">${money(p.gross)}</td></tr>`).join("") || '<tr><td colspan="3">No item sales in this period.</td></tr>'}</tbody></table>
<h3>Payment methods (gross)</h3><table><thead><tr><th>Method</th><th class="number">Collected</th></tr></thead><tbody>${
    Object.entries(data.methods)
      .map(
        ([method, total]) =>
          `<tr><td>${escape(method)}</td><td class="number">${money(total)}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="2">No collected payments in this period.</td></tr>'
  }</tbody></table>
<h3>Orders</h3><table><thead><tr><th>Order</th><th>Payment</th><th class="number">Gross</th><th class="number">Refund</th><th class="number">Net</th></tr></thead><tbody>${data.orders.map((o) => `<tr><td>TA-${o.order_id}</td><td>${escape(o.payment_method)}</td><td class="number">${money(o.total)}</td><td class="number">${money(o.refund)}</td><td class="number">${money(o.total - o.refund)}</td></tr>`).join("") || '<tr><td colspan="5">No paid sales in this period.</td></tr>'}</tbody></table>
<footer class="notice"><p>Paid/refunded orders placed within this period. Includes paid cancelled orders; excludes unpaid orders. Refunds are completed refunds for these orders as of report generation, including later refunds. This is not a payment settlement ledger. Product totals are before refunds.</p><p>PayMongo configuration: ${escape(data.paymongoMode)}. Historical payment mode is not recorded per order; this report may include sandbox transactions.</p><p>Generated ${escape(new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }))} · Manila time</p></footer>
</main></body></html>`;
}
