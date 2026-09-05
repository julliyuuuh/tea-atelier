"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import {
  ErrorBanner,
  StatChip,
  SortHeader,
  CustomSelect,
  rowVariants,
  type SortConfig,
} from "@/components/admin/AdminUI";

type Order = {
  id: number;
  customerEmail: string;
  recipientName: string | null;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  itemCount: number;
  createdAt: string;
};

type SortKey = "id" | "totalAmount" | "createdAt" | "itemCount";

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Shared column layout so the header, skeleton rows, and data rows always line up.
const GRID_COLS =
  "minmax(90px,0.7fr) minmax(200px,2fr) minmax(70px,0.6fr) minmax(100px,0.9fr) minmax(110px,0.9fr) minmax(150px,1.1fr)";

function statusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
    case "SHIPPED":
      return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
    case "DELIVERED":
      return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    case "CANCELLED":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    default:
      return { bg: "bg-charcoal/10", text: "text-charcoal/60", dot: "bg-charcoal/40" };
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>({
    key: "createdAt",
    direction: "desc",
  });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setIsLoading(true);
    setErrorMessage("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load orders.");
      setOrders(data.orders);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    setActionError("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Unable to update order status.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const cancelledCount = orders.filter((o) => o.status === "CANCELLED").length;

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      `ta-${o.id}`.includes(q) ||
      (o.recipientName || "").toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "All" || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedFiltered = useMemo(() => {
    if (!sortConfig) return filtered;
    const { key, direction } = sortConfig;
    return [...filtered].sort((a, b) => {
      let aVal: string | number = key === "createdAt" ? new Date(a[key]).getTime() : a[key];
      let bVal: string | number = key === "createdAt" ? new Date(b[key]).getTime() : b[key];
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortConfig]);

  const hasActiveFilters = search !== "" || filterStatus !== "All";
  const clearFilters = () => {
    setSearch("");
    setFilterStatus("All");
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
          Orders
        </h1>
        <p className="font-body text-sm text-charcoal/60">
          {isLoading ? (
            "Loading..."
          ) : (
            <AnimatePresence mode="wait">
              <motion.span
                key={sortedFiltered.length}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="inline-block"
              >
                {sortedFiltered.length} of {orders.length} orders
              </motion.span>
            </AnimatePresence>
          )}
        </p>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadOrders} />
      <ErrorBanner message={actionError} />

      {/* Stat chips */}
      {!isLoading && (
        <div className="flex flex-wrap gap-3 mb-6">
          <StatChip label="Total Orders" value={orders.length} />
          <StatChip label="Pending" value={pendingCount} tone="warning" />
          <StatChip label="Cancelled" value={cancelledCount} tone="danger" />
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white border border-charcoal/10 rounded-xl px-4 py-3">
        <input
          type="text"
          placeholder="Search by order #, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-sm border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        <CustomSelect
          id="filter-status"
          value={filterStatus}
          onChange={setFilterStatus}
          options={STATUS_OPTIONS}
          triggerClassName="min-w-[170px] border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              type="button"
              onClick={clearFilters}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="font-body text-sm text-charcoal/60 hover:text-charcoal underline px-1"
            >
              Clear filters
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div
        className="bg-white border border-charcoal/10 rounded-xl overflow-hidden"
        role="table"
        aria-label="Orders"
      >
        <div role="rowgroup">
          <div
            role="row"
            className="grid border-b border-charcoal/10"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <SortHeader label="Order" sortKeyName="id" sortConfig={sortConfig} onSort={handleSort} />
            <div
              role="columnheader"
              className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3"
            >
              Customer
            </div>
            <SortHeader
              label="Items"
              sortKeyName="itemCount"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Total"
              sortKeyName="totalAmount"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Date"
              sortKeyName="createdAt"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <div
              role="columnheader"
              className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3"
            >
              Status
            </div>
          </div>
        </div>

        <div role="rowgroup">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                role="row"
                className="grid items-center py-3 border-b border-charcoal/5 last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <div className="px-5 space-y-1.5">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-40" />
                </div>
                <div className="px-5 flex justify-end">
                  <SkeletonBlock className="h-4 w-6" />
                </div>
                <div className="px-5 flex justify-end">
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-20" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                </div>
              </div>
            ))}

          {!isLoading && (
            <AnimatePresence initial={false}>
              {sortedFiltered.map((order, index) => {
                const badge = statusBadge(order.status);
                return (
                  <motion.div
                    key={order.id}
                    role="row"
                    layout
                    custom={index}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="grid items-center py-3 border-b border-charcoal/5 last:border-0 hover:bg-sand/20 hover:shadow-sm transition-colors overflow-hidden"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div role="cell" className="px-5">
                      <span className="font-body text-sm text-charcoal">
                        TA-{order.id}
                      </span>
                    </div>
                    <div role="cell" className="px-5 min-w-0">
                      <p className="font-body text-sm text-charcoal truncate">
                        {order.recipientName || "—"}
                      </p>
                      <p className="font-body text-xs text-charcoal/50 truncate">
                        {order.customerEmail}
                      </p>
                    </div>
                    <div role="cell" className="px-5 text-right">
                      <span className="font-body text-sm text-charcoal/70 tabular-nums">
                        {order.itemCount}
                      </span>
                    </div>
                    <div role="cell" className="px-5 text-right">
                      <span className="font-body text-sm text-charcoal/70 tabular-nums">
                        ₱{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div role="cell" className="px-5">
                      <span className="font-body text-xs text-charcoal/50">
                        {new Date(order.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div role="cell" className="px-5">
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`font-body text-xs px-3 py-1.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-sage disabled:opacity-50 transition-colors ${badge.bg} ${badge.text}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {!isLoading && sortedFiltered.length === 0 && (
            <div role="row" className="px-5 py-10">
              <div role="cell" className="flex flex-col items-center gap-2 text-center">
                <ClipboardList className="w-8 h-8 text-charcoal/20" />
                <span className="font-body text-sm text-charcoal/40">
                  No orders match your filters.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}