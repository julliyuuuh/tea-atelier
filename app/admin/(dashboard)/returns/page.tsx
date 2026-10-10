"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Inbox, Search, X } from "lucide-react";
import { CustomSelect } from "@/components/admin/AdminUI";
import ReturnReviewCard from "@/components/admin/ReturnReviewCard";
import type { ReturnCase } from "@/lib/returns";
export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnCase[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/returns?page=${page}&status=${status}&search=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            cache: "no-store",
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
              : AbortSignal.timeout(15000),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load requests.");
        if (!signal?.aborted) {
          setRequests(data.requests);
          setPages(data.totalPages);
          setError("");
        }
      } catch (cause) {
        if (!signal?.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to load requests.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, status, query],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <p className="font-body text-xs uppercase tracking-widest text-charcoal/50">
          Order support
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl sm:text-4xl">
          Returns & refunds
        </h1>
        <p className="mt-2 font-body text-sm text-charcoal/60">
          Review requests, inspect returned items, and issue test refunds or
          record COD refunds.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search return requests"
            placeholder="Search order #, customer email or name…"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-charcoal/20 bg-white py-2.5 pl-11 pr-10 font-body text-sm text-charcoal outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal/50 hover:bg-sand/40"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="return-status-filter"
            className="font-body text-sm text-charcoal/60"
          >
            Status
          </label>
          <CustomSelect
            id="return-status-filter"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            maxMenuHeight={360}
            triggerClassName="min-w-[170px] bg-white border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
            options={[
              { value: "", label: "All requests" },
              ...[
                "REQUESTED",
                "APPROVED",
                "RECEIVED",
                "REFUNDED",
                "REJECTED",
                "CLOSED",
              ].map((value) => ({
                value,
                label: value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-body text-sm text-sage transition hover:bg-sage/10 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="font-body text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p className="font-body text-sm text-charcoal/60">Loading requests…</p>
      ) : !requests.length ? (
        <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white p-12 text-center">
          <Inbox
            size={28}
            className="mx-auto mb-3 text-sage"
            aria-hidden="true"
          />
          <p className="font-body text-sm text-charcoal/60">
            No requests found.
          </p>
        </div>
      ) : (
        requests.map((request) => (
          <ReturnReviewCard
            key={`${request.return_id}:${request.version}`}
            request={request}
            onChanged={load}
            expanded={expandedId === request.return_id}
            onToggle={() =>
              setExpandedId((current) =>
                current === request.return_id ? null : request.return_id,
              )
            }
          />
        ))
      )}
      <div className="flex items-center justify-between gap-3 font-body text-sm">
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-xl border border-charcoal/10 px-4 py-2 transition hover:bg-white disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          type="button"
          disabled={loading || page >= pages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl border border-charcoal/10 px-4 py-2 transition hover:bg-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
