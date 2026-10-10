import { Check, Clock3, PackageCheck, X, CircleHelp } from "lucide-react";

const statuses = {
  REQUESTED: {
    label: "Requested",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  APPROVED: {
    label: "Approved",
    icon: Check,
    tone: "bg-sage/15 text-charcoal ring-sage/25",
  },
  RECEIVED: {
    label: "Items received",
    icon: PackageCheck,
    tone: "bg-sage/15 text-charcoal ring-sage/25",
  },
  REFUNDED: {
    label: "Refunded",
    icon: Check,
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  SUCCEEDED: {
    label: "Refund completed",
    icon: Check,
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: X,
    tone: "bg-red-50 text-red-700 ring-red-200",
  },
  FAILED: {
    label: "Refund failed",
    icon: X,
    tone: "bg-red-50 text-red-700 ring-red-200",
  },
  CLOSED: {
    label: "Closed",
    icon: Check,
    tone: "bg-charcoal/5 text-charcoal/70 ring-charcoal/10",
  },
  PROCESSING: {
    label: "Refund processing",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  PENDING: {
    label: "Refund pending",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  UNKNOWN: {
    label: "Verifying refund",
    icon: CircleHelp,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
};

export default function ReturnStatusBadge({ status }: { status: string }) {
  const item = statuses[status as keyof typeof statuses] ?? {
    label: status.replaceAll("_", " "),
    icon: CircleHelp,
    tone: "bg-charcoal/5 text-charcoal/70 ring-charcoal/10",
  };
  const Icon = item.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-medium ring-1 ring-inset ${item.tone}`}
    >
      <Icon size={13} aria-hidden="true" />
      {item.label}
    </span>
  );
}
