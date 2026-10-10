"use client";
import { useCallback, useEffect, useState } from "react";
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
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <div>
        <p className="font-body text-xs uppercase tracking-widest text-charcoal/50">
          Order support
        </p>
        <h1 className="font-display text-3xl">Returns & refunds</h1>
        <p className="mt-2 font-body text-sm text-charcoal/60">
          Review requests, inspect returned items, and issue test refunds or
          record COD refunds.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="font-body text-sm">
          Status{" "}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-charcoal/15 bg-cream p-2"
          >
            <option value="">All requests</option>
            {[
              "REQUESTED",
              "APPROVED",
              "RECEIVED",
              "REFUNDED",
              "REJECTED",
              "CLOSED",
            ].map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="font-body text-sm text-sage hover:underline"
        >
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
        <p className="font-body text-sm text-charcoal/60">No requests found.</p>
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
          className="disabled:opacity-40"
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
          className="disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
