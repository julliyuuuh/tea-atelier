export const ORDER_STATUSES = [
  { value: "PLACED", label: "Order Placed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export function getStatusLabel(value: string): string {
  return ORDER_STATUSES.find((s) => s.value === value.toUpperCase())?.label ?? value;
}