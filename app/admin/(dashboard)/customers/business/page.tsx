"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { CustomSelect } from "@/components/admin/AdminUI";
import ValidatedForm from "@/components/ValidatedForm";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import type { BusinessApplication } from "@/lib/business-context";
type Application = BusinessApplication & {
  first_name: string;
  last_name: string;
  email: string;
  user_id: number;
};
export default function BusinessRequests() {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("PENDING"),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [items, setItems] = useState<Application[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [pending, setPending] = useState<{
      application: Application;
      status: string;
      message: string;
    } | null>(null);
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
            signal: controller.signal,
          },
        );
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
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
  async function review() {
    if (!pending || saving) return;
    const next = pending;
    setPending(null);
    setSaving(true);
    setError("");
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
      if (!r.ok) throw Error(d.error);
      setDecisions((previous) => {
        const values = { ...previous };
        delete values[next.application.application_id];
        return values;
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save review.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <AdminPage>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <AdminPageHeader
          title="Business requests"
          description="Review applications for higher purchasing limits and manage approved businesses."
        />
        <Link href="/admin/customers" className="text-sm text-sage underline">
          Back to Customers
        </Link>
      </div>
      <div className="mb-5 flex gap-3">
        <CustomSelect
          id="business-status-filter"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={["PENDING", "APPROVED", "DECLINED", "REVOKED", "ALL"].map(
            (value) => ({
              value,
              label: value.charAt(0) + value.slice(1).toLowerCase(),
            }),
          )}
        />
        <button
          className="cursor-pointer text-sm text-sage"
          disabled={saving}
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading requests…</p>
      ) : !items.length ? (
        <p>No applications in this view.</p>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article
              key={a.application_id}
              className="rounded-2xl border border-charcoal/10 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="min-w-0 flex-1 break-words font-display text-xl">
                  {a.business_name}
                </h2>
                <span className="text-xs text-sage">{a.status}</span>
              </div>
              <p className="mt-1 break-words text-sm">
                {a.first_name} {a.last_name} · Customer #{a.user_id}
              </p>
              <p className="break-all text-xs text-charcoal/50">
                {a.email} ·{" "}
                {new Date(a.created_at).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                })}
              </p>
              <dl className="my-4 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Business type", a.business_type],
                  ["Contact details", a.contact_details],
                  ["Registration/reference", a.registration_number],
                  ["Purchasing plans", a.purchase_plan],
                  ["Admin response", a.admin_message || "No response yet"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-charcoal/50">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {["PENDING", "APPROVED"].includes(a.status) && (
                <ValidatedForm
                  key={a.application_id + ":" + a.version}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const values = new FormData(form);
                    setPending({
                      application: a,
                      status: String(values.get("decision")),
                      message: String(values.get("message")).trim(),
                    });
                  }}
                  className="space-y-3"
                >
                  <fieldset disabled={saving} className="space-y-3">
                    <label className="block text-xs">
                      Decision
                      <input
                        type="hidden"
                        name="decision"
                        value={
                          decisions[a.application_id] ||
                          (a.status === "APPROVED" ? "REVOKED" : "APPROVED")
                        }
                      />
                      <CustomSelect
                        id={`decision-${a.application_id}`}
                        disabled={saving}
                        value={
                          decisions[a.application_id] ||
                          (a.status === "APPROVED" ? "REVOKED" : "APPROVED")
                        }
                        onChange={(value) =>
                          setDecisions((previous) => ({
                            ...previous,
                            [a.application_id]: value,
                          }))
                        }
                        options={(a.status === "APPROVED"
                          ? ["REVOKED"]
                          : ["APPROVED", "DECLINED"]
                        ).map((value) => ({
                          value,
                          label: value.charAt(0) + value.slice(1).toLowerCase(),
                        }))}
                      />
                    </label>
                    <label className="block text-xs">
                      Message to customer
                      <textarea
                        name="message"
                        required
                        maxLength={1500}
                        rows={2}
                        className="mt-1 block w-full rounded-xl border border-charcoal/20 bg-transparent p-3 text-sm"
                      />
                    </label>
                    <button className="cursor-pointer rounded-full bg-sage px-4 py-2 text-sm text-cream">
                      Review decision
                    </button>
                  </fieldset>
                </ValidatedForm>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="mt-5 flex justify-between text-sm">
        <button
          disabled={page === 1 || loading || saving}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} · {total} requests
        </span>
        <button
          disabled={page * 20 >= total || loading || saving}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <ConfirmDialog
        open={!!pending}
        title="Confirm business purchasing decision?"
        description={
          pending
            ? `${pending.application.business_name}: ${pending.status.toLowerCase()}. The customer will be notified and their purchasing limits will update.`
            : undefined
        }
        confirmLabel="Confirm decision"
        destructive={pending?.status === "REVOKED"}
        onCancel={() => setPending(null)}
        onConfirm={() => void review()}
      />
    </AdminPage>
  );
}
