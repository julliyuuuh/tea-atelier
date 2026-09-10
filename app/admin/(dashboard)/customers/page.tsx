"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import {
  ErrorBanner,
  StatChip,
  SortHeader,
  PlainHeader,
  CustomSelect,
  rowVariants,
  type SortConfig,
} from "@/components/admin/AdminUI";

const PAGE_SIZE = 10;

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isVerified: boolean;
  orderCount: number;
  totalSpent: number;
  joinedAt: string;
};

type Stats = {
  total: number;
  verified: number;
  unverified: number;
};

type SortKey = "name" | "orderCount" | "totalSpent" | "joinedAt";

const VERIFIED_OPTIONS = [
  { value: "All", label: "All Customers" },
  { value: "Verified", label: "Verified" },
  { value: "Unverified", label: "Unverified" },
];

// Shared column layout so the header, skeleton rows, and data rows always line up.
const GRID_COLS =
  "minmax(200px,2.2fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(110px,1fr) minmax(110px,0.9fr) minmax(130px,1fr)";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "All") return;
    qs.set(key, String(value));
  });
  return qs.toString();
}

export default function AdminCustomersPage() {
  // Current page's rows only — the full customer list never lives in the browser.
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, unverified: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState("All");
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>(null);

  // Debounce search so we're not hitting the DB on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Any change to what we're querying should land back on page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterVerified, sortConfig]);

  const loadCustomers = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setErrorMessage("");
      const token = localStorage.getItem("token");
      try {
        const qs = buildQuery({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          verified: filterVerified,
          sortBy: sortConfig?.key,
          sortDir: sortConfig?.direction,
        });
        const res = await fetch(`/api/admin/customers?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load customers.");

        setCustomers(data.customers);
        setStats(data.stats);
        setTotalPages(data.totalPages);

        if (data.customers.length === 0 && page > 1 && data.total > 0) {
          setCurrentPage(page - 1);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, filterVerified, sortConfig],
  );

  useEffect(() => {
    loadCustomers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loadCustomers]);

  const hasActiveFilters = search !== "" || filterVerified !== "All";
  const clearFilters = () => {
    setSearch("");
    setFilterVerified("All");
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
          Customers
        </h1>
        <p className="font-body text-sm text-charcoal/60">
          {isLoading ? (
            "Loading..."
          ) : (
            <AnimatePresence mode="wait">
              <motion.span
                key={`${currentPage}-${customers.length}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="inline-block"
              >
                Page {currentPage} of {totalPages}
              </motion.span>
            </AnimatePresence>
          )}
        </p>
      </div>

      <ErrorBanner message={errorMessage} onRetry={() => loadCustomers(currentPage)} />

      {/* Stat chips — always reflect the whole customer base, not just this page */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatChip label="Total Customers" value={stats.total} />
        <StatChip label="Verified" value={stats.verified} />
        <StatChip label="Unverified" value={stats.unverified} tone="warning" />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white border border-charcoal/10 rounded-xl px-4 py-3">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-sm border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        <CustomSelect
          id="filter-verified"
          value={filterVerified}
          onChange={setFilterVerified}
          options={VERIFIED_OPTIONS}
          triggerClassName="min-w-[170px] bg-white border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
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
        aria-label="Customers"
      >
        <div role="rowgroup">
          <div
            role="row"
            className="grid items-center border-b border-charcoal/10"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <SortHeader label="Customer" sortKeyName="name" sortConfig={sortConfig} onSort={handleSort} />
            <PlainHeader label="Phone" />
            <SortHeader
              label="Orders"
              sortKeyName="orderCount"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Total Spent"
              sortKeyName="totalSpent"
              sortConfig={sortConfig}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Joined"
              sortKeyName="joinedAt"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <PlainHeader label="Verified" />
          </div>
        </div>

        <div role="rowgroup">
          {isLoading &&
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                role="row"
                className="grid items-center py-3 border-b border-charcoal/5 last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className="px-5 space-y-1.5">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-40" />
                </div>
                <div className="px-5">
                  <SkeletonBlock className="h-4 w-20" />
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
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}

          {!isLoading && (
            <AnimatePresence initial={false}>
              {customers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  role="row"
                  custom={index}
                  variants={rowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="grid items-center py-3 border-b border-charcoal/5 last:border-0 hover:bg-sand/20 hover:shadow-sm transition-colors overflow-hidden"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <div role="cell" className="px-5 min-w-0">
                    <p className="font-body text-sm text-charcoal truncate">
                      {customer.name}
                    </p>
                    <p className="font-body text-xs text-charcoal/50 truncate">
                      {customer.email}
                    </p>
                  </div>
                  <div role="cell" className="px-5">
                    <span className="font-body text-sm text-charcoal/70">
                      {customer.phone || "—"}
                    </span>
                  </div>
                  <div role="cell" className="px-5 text-right">
                    <span className="font-body text-sm text-charcoal/70 tabular-nums">
                      {customer.orderCount}
                    </span>
                  </div>
                  <div role="cell" className="px-5 text-right">
                    <span className="font-body text-sm text-charcoal/70 tabular-nums">
                      ₱{customer.totalSpent.toFixed(2)}
                    </span>
                  </div>
                  <div role="cell" className="px-5">
                    <span className="font-body text-xs text-charcoal/50">
                      {new Date(customer.joinedAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div role="cell" className="px-5">
                    <span
                      className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                        customer.isVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-charcoal/10 text-charcoal/50"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          customer.isVerified ? "bg-green-500" : "bg-charcoal/40"
                        }`}
                      />
                      {customer.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!isLoading && customers.length === 0 && (
            <div role="row" className="px-5 py-10">
              <div role="cell" className="flex flex-col items-center gap-2 text-center">
                <Users className="w-8 h-8 text-charcoal/20" />
                <span className="font-body text-sm text-charcoal/40">
                  No customers match your filters.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && customers.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="font-body text-xs text-charcoal/50">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="font-body text-xs px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}