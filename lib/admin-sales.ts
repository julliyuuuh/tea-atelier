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
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tea Atelier sales report</title><style>@page{size:A4;margin:16mm}body{font:14px Arial;color:#1f2621;max-width:960px;margin:32px auto}h1{font:32px Georgia}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #ddd}button{padding:12px}@media print{button{display:none}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>Tea Atelier · Sales Report</h1><p>${escape(data.from)} to ${escape(data.to)} · Manila time</p><p>Paid/refunded orders placed within this period. Includes paid cancelled orders; excludes unpaid orders. Refunds are completed refunds for these orders as of report generation, including later refunds. This is not a payment settlement ledger.</p><p>PayMongo configuration: ${escape(data.paymongoMode)}. Historical payment mode is not recorded per order; this report may include sandbox transactions.</p><p>Orders: ${data.orders.length} · Merchandise: ${money(data.merchandise)} · Shipping: ${money(data.shipping)} · Gross collected: ${money(data.gross)} · Refunds: ${money(data.refunds)} · Net: ${money(data.net)}</p><h2>Item sales before refunds</h2><table><tr><th>Product</th><th>Units</th><th>Gross</th></tr>${data.products.map((p) => `<tr><td>${escape(p.product_name)}</td><td>${p.units}</td><td>${money(p.gross)}</td></tr>`).join("")}</table><h2>Payment methods (gross)</h2>${Object.entries(
    data.methods,
  )
    .map(([m, n]) => `<p>${escape(m)}: ${money(n)}</p>`)
    .join(
      "",
    )}<table><thead><tr><th>Order</th><th>Payment</th><th>Gross</th><th>Refund</th><th>Net</th></tr></thead><tbody>${data.orders.map((o) => `<tr><td>TA-${o.order_id}</td><td>${escape(o.payment_method)}</td><td>${money(o.total)}</td><td>${money(o.refund)}</td><td>${money(o.total - o.refund)}</td></tr>`).join("")}</tbody></table><p>Generated ${escape(new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }))} · Manila time</p></body></html>`;
}
