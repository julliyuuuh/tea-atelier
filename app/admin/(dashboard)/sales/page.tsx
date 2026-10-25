import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminSalesPanel from "@/components/admin/AdminSalesPanel";

export default function AdminSalesPage() {
  return (
    <AdminPage>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="Sales Reports"
          description="Review sales by date, explore order details, and print a report for your records."
        />
        <Link
          href="/admin"
          className="rounded-full border border-sage/30 px-4 py-2 text-sm text-sage hover:bg-sage/10"
        >
          Back to Dashboard
        </Link>
      </div>
      <AdminSalesPanel />
    </AdminPage>
  );
}
