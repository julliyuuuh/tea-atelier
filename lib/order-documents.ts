import { pool } from "@/lib/db";

type Address = {
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  business_name?: string | null;
  billing_contact?: string | null;
  tax_id?: string | null;
};
type Snapshot = {
  shipping?: Address | null;
  billing?: Address | null;
  customer?: { name?: string; email?: string } | null;
};
type DocumentOrder = {
  order_id: number;
  created_at: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  recipient_name: string | null;
  contact_phone: string | null;
  shipping_cost: string;
  total_amount: string;
  document_snapshot?: Snapshot | null;
};
type DocumentItem = {
  product_id: number;
  quantity: number;
  price: string;
  product_name_snapshot?: string | null;
  current_product_name?: string | null;
};
export type DocumentKind = "invoice" | "packing-slip";

// Ownership is part of the query, so missing and another customer's order
// produce the same response. No customer authentication fields are selected.
export async function loadOrderDocument(orderId: number, userId?: number) {
  const { rows } = await pool.query<{
    order: DocumentOrder;
    address: Address | null;
    items: DocumentItem[];
  }>(
    `SELECT to_jsonb(o) AS "order",
      jsonb_build_object('address_line1', a.address_line1,
        'address_line2', a.address_line2, 'address_line3', a.address_line3) AS address,
      COALESCE((SELECT jsonb_agg(to_jsonb(oi) ||
          jsonb_build_object('current_product_name', p.product_name) ORDER BY oi.order_items_id)
        FROM order_items oi LEFT JOIN products p ON p.product_id = oi.product_id
        WHERE oi.order_id = o.order_id), '[]'::jsonb) AS items
     FROM orders o LEFT JOIN user_address a ON a.address_id = o.address_id
     WHERE o.order_id = $1 AND ($2::integer IS NULL OR o.user_id = $2)`,
    [orderId, userId ?? null],
  );
  return rows[0] ?? null;
}

function escape(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
function addressLines(address?: Address | null) {
  return (
    [address?.address_line1, address?.address_line2, address?.address_line3]
      .filter(Boolean)
      .map((line) => `<div>${escape(line)}</div>`)
      .join("") || "<div>Address not recorded</div>"
  );
}

export function renderOrderDocument(
  data: NonNullable<Awaited<ReturnType<typeof loadOrderDocument>>>,
  kind: DocumentKind,
) {
  const { order, items } = data;
  const invoice = kind === "invoice";
  const snapshot = order.document_snapshot;
  const shipping = snapshot ? snapshot.shipping : data.address;
  const billing = snapshot?.billing;
  const customer = snapshot?.customer;
  const title = invoice ? "Order invoice" : "Packing slip";
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const payment =
    order.payment_status === "paid"
      ? "Paid"
      : order.payment_status === "failed"
        ? "Payment failed · Unpaid"
        : order.payment_status === "refunded"
          ? "Refunded"
          : "Unpaid";
  const methods: Record<string, string> = {
    cod: "Cash on Delivery",
    card: "Credit/debit card",
    gcash: "GCash",
    paymaya: "Maya",
  };
  const date = new Date(order.created_at).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tea Atelier — ${title} TA-${escape(order.order_id)}</title>
<style>
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #fdf6ed; color: #1f2621; font: 14px/1.5 Arial, sans-serif; }
.toolbar { padding: 16px; text-align: center; }
button { padding: 10px 18px; border: 0; border-radius: 8px; background: #1f2621; color: white; cursor: pointer; font: inherit; }
.sheet { max-width: 800px; margin: 0 auto 32px; padding: 40px; background: white; }
header, .addresses { display: flex; justify-content: space-between; gap: 32px; }
h1 { font: 32px Georgia, serif; margin: 0; } h2 { font-size: 20px; margin: 0 0 8px; } h3 { font-size: 12px; text-transform: uppercase; color: #566650; margin: 0 0 8px; }
.meta { text-align: right; } .addresses { margin: 32px 0; } .addresses > section { flex: 1; min-width: 0; overflow-wrap: anywhere; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 12px 8px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
th { background: #f5f5f2; font-size: 12px; } .number { text-align: right; width: ${invoice ? "18%" : "20%"}; }
.totals { width: 300px; max-width: 100%; margin: 24px 0 24px auto; }
.totals p { display: flex; justify-content: space-between; gap: 20px; margin: 8px 0; } .total { border-top: 1px solid #999; padding-top: 12px; font-weight: bold; }
.notice { color: #666; font-size: 12px; } .status { margin: 16px 0; } footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px; }
thead { display: table-header-group; } tr, .totals, .addresses, footer { break-inside: avoid; }
@media (max-width: 600px) { .sheet { padding: 20px; } header, .addresses { flex-direction: column; gap: 20px; } .meta { text-align: left; } }
@media print { body { background: white; color: black; } .toolbar { display: none; } .sheet { max-width: none; margin: 0; padding: 0; } header, .addresses { flex-direction: row; } .meta { text-align: right; } }
</style></head><body>
<div class="toolbar"><button id="print-document" type="button">Print / Save as PDF</button><p class="notice">Choose “Save as PDF” as the printer to export this document.</p></div>
<main class="sheet"><header><div><h1>Tea Atelier</h1><p>Where every leaf tells a story</p></div><div class="meta"><h2>${title}</h2><div>Order #TA-${escape(order.order_id)}</div><div>${escape(date)}</div></div></header>
<p class="status">Order status: <strong>${escape(order.order_status)}</strong>${invoice ? ` · Payment: <strong>${escape(payment)}</strong>` : ""}</p>
<div class="addresses">
${invoice ? `<section><h3>Bill to</h3>${billing ? `${billing.business_name ? `<strong>${escape(billing.business_name)}</strong>` : ""}<div>${escape(billing.billing_contact || customer?.name || "Customer")}</div>${addressLines(billing)}${billing.tax_id ? `<div>TIN: ${escape(billing.tax_id)}</div>` : ""}` : `<div>${escape(customer?.name || order.recipient_name || "Customer")}</div><p class="notice">No separate billing address was recorded for this order.</p>`}${customer?.email ? `<div>${escape(customer.email)}</div>` : ""}</section>` : ""}
<section><h3>Ship to</h3><strong>${escape(order.recipient_name || "Recipient not recorded")}</strong>${addressLines(shipping)}${order.contact_phone ? `<div>${escape(order.contact_phone)}</div>` : ""}</section></div>
<table><thead><tr><th>Item</th><th class="number">Qty</th>${invoice ? '<th class="number">Unit price</th><th class="number">Amount</th>' : ""}</tr></thead><tbody>
${items.map((item) => `<tr><td>${escape(item.product_name_snapshot || item.current_product_name || `Product #${item.product_id} (name unavailable)`)}</td><td class="number">${escape(item.quantity)}</td>${invoice ? `<td class="number">${escape(money(Number(item.price)))}</td><td class="number">${escape(money(Number(item.price) * item.quantity))}</td>` : ""}</tr>`).join("")}
</tbody></table>
${invoice ? `<div class="totals"><p><span>Subtotal</span><span>${escape(money(subtotal))}</span></p><p><span>Shipping</span><span>${escape(money(Number(order.shipping_cost)))}</span></p><p class="total"><span>Order total</span><span>${escape(money(Number(order.total_amount)))}</span></p></div><p>Payment method: ${escape(methods[order.payment_method] || order.payment_method)}</p>` : `<p>Total units: ${items.reduce((sum, item) => sum + item.quantity, 0)}</p>`}
${!snapshot ? '<p class="notice">Historical order: billing details and product names were not captured at checkout. Available order records are shown.</p>' : ""}
${items.some((item) => !item.product_name_snapshot && item.current_product_name) ? '<p class="notice">Where the original product name was not recorded, the current catalog name is shown.</p>' : ""}
<footer>${invoice ? '<p class="notice">Order summary for your records. This is not a BIR tax invoice or proof of payment.</p>' : '<p class="notice">Packing checklist for shipment preparation.</p>'}</footer></main></body></html>`;
}
