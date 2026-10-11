"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, History, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuditDateRange from "@/components/admin/AuditDateRange";
import { CustomSelect } from "@/components/admin/AdminUI";
import {
  AUDIT_RESOURCES,
  auditCustomerName,
  type AuditEvent,
} from "@/lib/admin-audit-types";
const label = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const display = (value: unknown) =>
  value === undefined || value === null
    ? "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
function AuditCard({ event }: { event: AuditEvent }) {
  const [open, setOpen] = useState(false);
  const before = event.before_data || {},
    after = event.after_data || {};
  const fields = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  ).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  const orderId = after.order_id ?? before.order_id;
  const customerName = auditCustomerName(event);
  const resource =
    AUDIT_RESOURCES[event.resource_type as keyof typeof AUDIT_RESOURCES] ||
    event.resource_type;
  return (
    <article className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`audit-${event.event_id}`}
        className="flex w-full items-start justify-between gap-4 p-5 text-left outline-none transition hover:bg-sand/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage/40 sm:p-6"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sage/10 px-2.5 py-1 font-body text-xs text-sage">
              {label(event.action)}
            </span>
            <span className="break-words font-body text-xs text-charcoal/50">
              {resource} · {customerName && <>{customerName} · </>}
              {orderId ? `Order #TA-${orderId}` : `#${event.resource_id}`}
            </span>
          </div>
          <p className="break-words font-body text-sm font-medium text-charcoal">
            {event.actor_name}{" "}
            <span className="font-normal text-charcoal/50">
              · {event.actor_role === "super_admin" ? "Super admin" : "Admin"}
            </span>
          </p>
          <p className="break-all font-body text-xs text-charcoal/50">
            {event.actor_email}
          </p>
          <time
            dateTime={event.created_at}
            className="block font-body text-xs text-charcoal/50"
          >
            {new Date(event.created_at).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            · Manila time
          </time>
          {event.origin === "refund_processing" && (
            <p className="font-body text-xs text-sage">
              Refund processing outcome for this admin’s initiated refund
            </p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-sage transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div id={`audit-${event.event_id}`} hidden={!open}>
        {open && (
          <div className="border-t border-charcoal/10 p-5 sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-charcoal/10 pb-3 font-body text-xs font-medium text-charcoal/50">
              <span>Field</span>
              <span>Before</span>
              <span>After</span>
            </div>
            <dl className="divide-y divide-charcoal/10">
              {fields.map((field) => (
                <div
                  key={field}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 py-3 font-body text-xs sm:text-sm"
                >
                  <dt className="break-words text-charcoal/60">
                    {label(field)}
                  </dt>
                  <dd className="whitespace-pre-wrap break-all text-charcoal/50">
                    {display(before[field])}
                  </dd>
                  <dd className="whitespace-pre-wrap break-all text-charcoal">
                    {display(after[field])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}
export default function AdminAuditPage() {
  const { user, isLoading } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0),
    [pages, setPages] = useState(1),
    [page, setPage] = useState(1);
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (user?.role !== "super_admin") return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          search: query,
          type,
          from,
          to,
        });
        const response = await fetch(`/api/admin/audit?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load audit history.");
        if (!signal?.aborted) {
          setEvents(data.events);
          setTotal(data.total);
          setPages(data.totalPages);
          setError("");
        }
      } catch (cause) {
        if (!signal?.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load audit history.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, query, type, from, to, user?.role],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  if (isLoading)
    return <p className="p-8 font-body text-sm text-charcoal/60">Loading…</p>;
  if (user?.role !== "super_admin")
    return (
      <p className="p-8 font-body text-sm text-charcoal/60">
        The platform audit trail is available to super admins.
      </p>
    );
  const field =
    "rounded-full border border-charcoal/20 bg-white px-4 py-2.5 font-body text-sm text-charcoal outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <header>
        <p className="font-body text-xs uppercase tracking-widest text-charcoal/50">
          Super admin
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Audit trail</h1>
        <p className="mt-2 font-body text-sm text-charcoal/60">
          Review who changed what across your platform. Entries are read-only.
        </p>
      </header>
      <div className="space-y-4 rounded-2xl border border-charcoal/10 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search audit history"
              placeholder="Search admin name, email, record ID or action…"
              className={`${field} w-full pl-11`}
            />
          </div>
          <CustomSelect
            id="audit-resource"
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
            triggerClassName={`${field} min-w-44`}
            maxMenuHeight={400}
            options={[
              { value: "", label: "All areas" },
              ...Object.entries(AUDIT_RESOURCES).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
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
        <div className="flex flex-wrap items-center gap-3">
          <AuditDateRange
            from={from}
            to={to}
            onChange={(start, end) => {
              setFrom(start);
              setTo(end);
              setPage(1);
            }}
          />
          <span className="font-body text-xs text-charcoal/40">
            Dates use Manila time
          </span>
          {(search || type || from || to) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setQuery("");
                setType("");
                setFrom("");
                setTo("");
                setPage(1);
              }}
              className="font-body text-xs text-sage underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700"
        >
          {error}
        </p>
      ) : loading ? (
        <p className="font-body text-sm text-charcoal/60">Loading history…</p>
      ) : (
        <>
          <p className="font-body text-xs text-charcoal/50">
            {total} {total === 1 ? "entry" : "entries"} · Successful changes
            only
          </p>
          {events.length ? (
            events.map((event) => (
              <AuditCard key={event.event_id} event={event} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white p-12 text-center">
              <History
                size={26}
                className="mx-auto mb-3 text-sage"
                aria-hidden="true"
              />
              <p className="font-body text-sm text-charcoal/60">
                No audit entries found.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between font-body text-xs">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-full border border-charcoal/15 px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-full border border-charcoal/15 px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
