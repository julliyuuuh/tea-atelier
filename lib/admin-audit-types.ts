export const AUDIT_RESOURCES = {
  product: "Products",
  order: "Orders",
  customer: "Customers",
  admin_account: "Admin accounts",
  return: "Returns",
  refund: "Refunds",
  contact: "Contact messages",
  cms: "Content management",
  settings: "Store settings",
  campaign: "Promotional campaigns",
  business: "Business applications",
} as const;
export type AuditEvent = {
  event_id: string;
  actor_id: number;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  origin: string;
  action: string;
  resource_type: string;
  resource_id: string;
  table_name: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

export function auditCustomerName(event: AuditEvent): string | null {
  if (event.resource_type !== "customer") return null;
  for (const snapshot of [event.after_data, event.before_data]) {
    const name = [snapshot?.first_name, snapshot?.last_name]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
    if (name) return name;
  }
  return null;
}
