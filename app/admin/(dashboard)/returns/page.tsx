"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Inbox } from "lucide-react";
import { CustomSelect } from "@/components/admin/AdminUI";
import ReturnReviewCard from "@/components/admin/ReturnReviewCard";
import type { ReturnCase } from "@/lib/returns";
export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnCase[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/returns?page=${page}&status=${status}`,
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
    [page, status],
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
