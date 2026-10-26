"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Building2, RefreshCw, X } from "lucide-react";
import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminPage";
import {
  CustomSelect,
  ErrorBanner,
  PlainHeader,
  StatChip,
} from "@/components/admin/AdminUI";
import { SkeletonBlock } from "@/components/Skeleton";
import ValidatedForm from "@/components/ValidatedForm";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import type { BusinessApplication } from "@/lib/business-context";

type Application = BusinessApplication & {
  first_name: string;
  last_name: string;
  email: string;
  user_id: number;
};
type Decision = "APPROVED" | "DECLINED" | "REVOKED";
type Draft = { decision: Decision; message: string };
type Review = { application: Application; status: Decision; message: string };
const PAGE_SIZE = 20;
const GRID_COLS =
  "minmax(200px,1.7fr) minmax(210px,1.5fr) minmax(140px,1fr) minmax(130px,0.8fr) minmax(110px,0.7fr)";
const pillButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-charcoal/20 px-3 py-1.5 font-body text-xs text-charcoal transition-colors hover:bg-sand/30 disabled:cursor-not-allowed disabled:opacity-40";
const selectTrigger =
  "min-w-[170px] rounded-full border border-charcoal/20 bg-white px-4 py-2.5 font-body text-sm text-charcoal transition-colors focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20";
const statusLabels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  REVOKED: "Revoked",
  ALL: "All requests",
};
const statusColors = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  REVOKED: "bg-charcoal/10 text-charcoal/60",
};
function StatusBadge({ status }: { status: Application["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-body text-xs ${statusColors[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}
const draftKey = (a: Application) => `${a.application_id}:${a.version}`;
const date = (value: string, full = false) =>
  new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(full ? ({ hour: "numeric", minute: "2-digit" } as const) : {}),
  });

export default function BusinessRequests() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pending, setPending] = useState<Review | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const open = selected !== null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(
          `/api/admin/business?${new URLSearchParams({ status, page: String(page) })}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
            cache: "no-store",
          },
        );
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Unable to load requests.");
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(d.total / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setItems(d.applications);
        setTotal(d.total);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load requests.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [status, page, version]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (focusReturnRef.current?.isConnected) focusReturnRef.current.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const container = pending ? confirmationRef.current : panelRef.current;
    (
      container?.querySelector<HTMLElement>("button:not(:disabled)") ||
      container
    )?.focus();
    const onKey = (event: KeyboardEvent) => {
      // The portalled custom select handles its own keyboard navigation first.
      if (document.querySelector('[role="listbox"]')) return;
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        if (pending) setPending(null);
        else setSelected(null);
      }
      if (event.key !== "Tab") return;
      const focusable = container?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), a[href], [tabindex="0"]',
      );
      if (!focusable?.length) {
        event.preventDefault();
        container?.focus();
        return;
      }
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (
        !container?.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, saving]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentDraft = selected
    ? drafts[draftKey(selected)] ||
      ({
        decision: selected.status === "APPROVED" ? "REVOKED" : "APPROVED",
        message: "",
      } as Draft)
    : null;
  const updateDraft = (patch: Partial<Draft>) => {
    if (!selected || !currentDraft) return;
    setDrafts((previous) => ({
      ...previous,
      [draftKey(selected)]: { ...currentDraft, ...patch },
    }));
  };
  const close = () => {
    if (!saving && !pending) setSelected(null);
  };
  async function review() {
    if (!pending || saving) return;
    const next = pending;
    setPending(null);
    setSaving(true);
    setActionError("");
    setSuccess("");
    try {
      const r = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: next.application.application_id,
          status: next.status,
          message: next.message,
          version: next.application.version,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Unable to save review.");
      setDrafts((previous) => {
        const values = { ...previous };
        delete values[draftKey(next.application)];
        return values;
      });
      setSelected(null);
      setSuccess(
        `${next.application.business_name}: ${statusLabels[next.status].toLowerCase()}. The customer has been notified.`,
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unable to save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <AdminPageHeader
          title="Business requests"
          eyebrow="Customer management"
          description="Review applications for higher purchasing limits and manage approved businesses."
        />
        <StatChip
          label={
            status === "ALL"
              ? "Total requests"
              : `${statusLabels[status as keyof typeof statusLabels]} requests`
          }
          value={total}
        />
      </div>
      <Link href="/admin/customers" className={`${pillButton} mb-4`}>
        <ArrowLeft size={14} />
        Back to Customers
      </Link>
      <ErrorBanner message={error} onRetry={() => setVersion((v) => v + 1)} />
      {success && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <CustomSelect
            id="business-status-filter"
            value={status}
            disabled={loading || saving}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            triggerClassName={selectTrigger}
          />
          <span className="text-xs text-charcoal/50">
            {loading
              ? "Loading requests…"
              : `${total} ${total === 1 ? "request" : "requests"}`}
          </span>
        </div>
        <button
          type="button"
          className={pillButton}
          disabled={loading || saving}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      <AdminTable label="Business requests" minWidth={900}>
        <div role="rowgroup">
          <div
            role="row"
            className="grid items-center border-b border-charcoal/10"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <PlainHeader label="Business" />
            <PlainHeader label="Customer" />
            <PlainHeader label="Submitted" />
            <PlainHeader label="Status" />
            <PlainHeader label="Actions" align="right" />
          </div>
        </div>
        <div role="rowgroup">
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                role="row"
                className="grid items-center border-b border-charcoal/5 py-3 last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} role="cell" className="space-y-2 px-5">
                    <SkeletonBlock className="h-4 w-24" />
                    {j < 2 && <SkeletonBlock className="h-3 w-32" />}
                  </div>
                ))}
              </div>
            ))
          ) : error ? (
            <div role="row">
              <div
                role="cell"
                className="px-5 py-10 text-center text-sm text-charcoal/50"
              >
                Requests could not be loaded. Use Retry above.
              </div>
            </div>
          ) : items.length ? (
            items.map((a) => (
              <div
                key={a.application_id}
                role="row"
                className="grid items-center overflow-hidden border-b border-charcoal/5 py-3 transition-colors last:border-0 hover:bg-sand/20"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div role="cell" className="min-w-0 px-5">
                  <p
                    className="truncate text-sm text-charcoal"
                    title={a.business_name}
                  >
                    {a.business_name}
                  </p>
                  <p
                    className="truncate text-xs text-charcoal/50"
                    title={a.business_type}
                  >
                    {a.business_type}
                  </p>
                </div>
                <div role="cell" className="min-w-0 px-5">
                  <p className="truncate text-sm text-charcoal">
                    {a.first_name} {a.last_name}
                  </p>
                  <p
                    className="truncate text-xs text-charcoal/50"
                    title={a.email}
                  >
                    {a.email}
                  </p>
                </div>
                <div role="cell" className="px-5 text-xs text-charcoal/50">
                  {date(a.created_at)}
                </div>
                <div role="cell" className="px-5">
                  <StatusBadge status={a.status} />
                </div>
                <div role="cell" className="flex justify-end px-5">
                  <button
                    type="button"
                    aria-label={`View ${a.business_name}`}
                    className={pillButton}
                    onClick={(event) => {
                      focusReturnRef.current = event.currentTarget;
                      setSelected(a);
                      setActionError("");
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div role="row">
              <div
                role="cell"
                className="flex flex-col items-center gap-2 px-5 py-10 text-center"
              >
                <Building2 className="h-8 w-8 text-charcoal/20" />
                <p className="text-sm text-charcoal/40">
                  No business requests match this status.
                </p>
              </div>
            </div>
          )}
        </div>
      </AdminTable>
      {!loading && !error && total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-charcoal/50">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total} · Page {page} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={pillButton}
              disabled={page === 1 || saving}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={pillButton}
              disabled={page >= totalPages || saving}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {selected && currentDraft && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="business-request-title"
              tabIndex={-1}
              className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-charcoal shadow-xl outline-none"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-charcoal/10 px-6 py-4">
                <div className="min-w-0">
                  <p className="mb-1 text-xs uppercase tracking-wide text-charcoal/50">
                    Business application
                  </p>
                  <h2
                    id="business-request-title"
                    className="break-words font-display text-2xl"
                  >
                    {selected.business_name}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close business request"
                  disabled={saving || !!pending}
                  onClick={close}
                  className="shrink-0 cursor-pointer rounded-full p-2 text-charcoal/50 hover:bg-sand/30 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 space-y-4 overflow-y-auto p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge status={selected.status} />
                  <p className="text-xs text-charcoal/50">
                    {date(selected.created_at, true)} · Manila time
                  </p>
                </div>
                <section className="rounded-2xl border border-charcoal/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">
                    Customer
                  </h3>
                  <p className="break-words text-sm">
                    {selected.first_name} {selected.last_name}{" "}
                    <span className="text-charcoal/50">
                      · Customer #{selected.user_id}
                    </span>
                  </p>
                  <p className="mt-1 break-all text-xs text-charcoal/50">
                    {selected.email}
                  </p>
                </section>
                <section className="rounded-2xl border border-charcoal/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">
                    Application details
                  </h3>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Business type", selected.business_type],
                      ["Contact details", selected.contact_details],
                      ["Registration/reference", selected.registration_number],
                      ["Purchasing plans", selected.purchase_plan],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-charcoal/50">{label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                {selected.admin_message && (
                  <section className="rounded-2xl border border-charcoal/10 p-4">
                    <h3 className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">
                      Admin response
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {selected.admin_message}
                    </p>
                    {selected.reviewed_at && (
                      <p className="mt-2 text-xs text-charcoal/50">
                        Reviewed {date(selected.reviewed_at, true)} · Manila
                        time
                      </p>
                    )}
                  </section>
                )}
                {["PENDING", "APPROVED"].includes(selected.status) && (
                  <section className="rounded-2xl border border-charcoal/10 p-4">
                    <h3 className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">
                      Review application
                    </h3>
                    <ErrorBanner message={actionError} />
                    <ValidatedForm
                      key={draftKey(selected)}
                      onSubmit={(event) => {
                        event.preventDefault();
                        setPending({
                          application: selected,
                          status: currentDraft.decision,
                          message: currentDraft.message.trim(),
                        });
                      }}
                      validateField={(field) =>
                        field.name === "message" && !field.value.trim()
                          ? "Enter a message to the customer."
                          : null
                      }
                      className="space-y-4"
                    >
                      <fieldset
                        disabled={saving || !!pending}
                        className="space-y-4 disabled:opacity-60"
                      >
                        <div>
                          <label
                            htmlFor="business-review-decision"
                            className="mb-1.5 block text-xs text-charcoal/60"
                          >
                            Decision
                          </label>
                          <CustomSelect
                            id="business-review-decision"
                            disabled={saving || !!pending}
                            value={currentDraft.decision}
                            onChange={(value) =>
                              updateDraft({ decision: value as Decision })
                            }
                            options={(selected.status === "APPROVED"
                              ? ["REVOKED"]
                              : ["APPROVED", "DECLINED"]
                            ).map((value) => ({
                              value,
                              label: statusLabels[value as Decision],
                            }))}
                            triggerClassName={`${selectTrigger} w-full sm:w-56`}
                          />
                        </div>
                        <label className="block text-xs text-charcoal/60">
                          Message to customer
                          <textarea
                            name="message"
                            required
                            maxLength={1500}
                            rows={3}
                            value={currentDraft.message}
                            onChange={(event) =>
                              updateDraft({ message: event.target.value })
                            }
                            placeholder="Explain your decision to the customer…"
                            className="mt-1.5 block w-full resize-y rounded-xl border border-charcoal/20 bg-transparent px-3 py-2 text-sm text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                          />
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-charcoal/50">
                            The customer will receive your response in their
                            notifications.
                          </p>
                          <button
                            type="submit"
                            className="cursor-pointer rounded-full bg-sage px-5 py-2.5 text-sm text-cream transition-colors hover:bg-charcoal"
                          >
                            {saving ? "Saving…" : "Review decision"}
                          </button>
                        </div>
                      </fieldset>
                    </ValidatedForm>
                  </section>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={confirmationRef} className="relative z-[160]" tabIndex={-1}>
        <ConfirmDialog
          open={!!pending}
          title="Confirm business purchasing decision?"
          description={
            pending
              ? `${pending.application.business_name}: ${statusLabels[pending.status].toLowerCase()}. The customer will be notified and their purchasing limits will update.`
              : undefined
          }
          confirmLabel="Confirm decision"
          destructive={pending?.status === "REVOKED"}
          onCancel={() => setPending(null)}
          onConfirm={() => void review()}
        />
      </div>
    </AdminPage>
  );
}
