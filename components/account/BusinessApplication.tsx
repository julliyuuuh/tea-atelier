"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";
import { php } from "@/lib/purchase-limits";
import ValidatedForm from "@/components/ValidatedForm";
export default function BusinessApplication() {
  const { user } = useAuth();
  const { application, approved, limits, ready, error, refresh } =
    useBusiness();
  const [sending, setSending] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (user?.role !== "customer") return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh, user?.role]);
  if (user?.role !== "customer") return null;
  const tier = approved ? limits.business : limits.standard;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    const form = e.currentTarget;
    try {
      const body = Object.fromEntries(new FormData(form));
      const r = await fetch("/api/business", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 409) await refresh();
        throw Error(d.error);
      }
      await refresh();
      setMessage(
        "Application submitted. You will receive a notification when it is reviewed.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to submit application.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section
      id="business-purchasing"
      className="mt-5 rounded-2xl border border-charcoal/10 bg-sand/20 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl">Business purchasing</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          className="cursor-pointer text-xs text-sage hover:underline"
        >
          Refresh status
        </button>
      </div>
      <p className="my-3 text-sm text-charcoal/60">
        {approved
          ? "Business purchasing enabled"
          : application?.status === "PENDING"
            ? "Your application is under review."
            : "Buying in bulk? Apply for higher purchase limits."}
      </p>
      <p className="text-xs text-charcoal/50">
        {tier.perProduct} per product · {tier.totalUnits} units per checkout ·
        Up to {php(tier.totalCents)} including delivery. COD up to{" "}
        {php(limits.codCents)}.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </p>
      )}
      {application?.admin_message && (
        <div className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-sage/20 p-3 text-sm">
          <p className="mb-1 text-xs text-charcoal/50">
            {application.status} · Admin response
          </p>
          {application.admin_message}
        </div>
      )}
      {ready && !approved && application?.status !== "PENDING" && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-sage">
            {application
              ? "Submit a new application"
              : "Apply for bulk purchasing"}
          </summary>
          <ValidatedForm
            validateField={(field) =>
              field.required && !field.value.trim()
                ? "Please enter this detail."
                : null
            }
            onSubmit={submit}
            className="mt-4 space-y-3"
          >
            <fieldset disabled={sending} className="grid gap-3 sm:grid-cols-2">
              {[
                ["business_name", "Business name", 150],
                ["business_type", "Business type", 100],
                ["contact_details", "Business contact details", 300],
                ["registration_number", "Registration / reference number", 100],
              ].map(([name, label, max]) => (
                <label key={String(name)} className="text-xs text-charcoal/60">
                  {label}
                  <input
                    name={String(name)}
                    required
                    maxLength={Number(max)}
                    defaultValue={
                      (application?.[
                        name as keyof typeof application
                      ] as string) || ""
                    }
                    className="mt-1 block w-full rounded-xl border border-charcoal/20 bg-transparent px-3 py-2.5 text-sm"
                  />
                </label>
              ))}
              <label className="text-xs text-charcoal/60 sm:col-span-2">
                Expected quantities and purchasing plans
                <textarea
                  name="purchase_plan"
                  required
                  minLength={10}
                  maxLength={1500}
                  rows={3}
                  className="mt-1 block w-full rounded-xl border border-charcoal/20 bg-transparent px-3 py-2.5 text-sm"
                />
              </label>
            </fieldset>
            <button
              disabled={sending}
              className="cursor-pointer rounded-full bg-sage px-4 py-2 text-sm text-cream disabled:opacity-40"
            >
              {sending ? "Submitting…" : "Submit application"}
            </button>
          </ValidatedForm>
        </details>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-sage">
          {message}
        </p>
      )}
    </section>
  );
}
