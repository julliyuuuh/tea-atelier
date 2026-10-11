"use client";
import ValidatedForm from "@/components/ValidatedForm";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Plus,
  RefreshCw,
  Eye,
  Send,
  X,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Smartphone,
  Monitor,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";
import { CustomSelect } from "@/components/admin/AdminUI";
import { AdminSearch } from "@/components/admin/AdminPage";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import {
  campaignEmail,
  type Campaign,
  type CampaignInput,
} from "@/lib/marketing";
const blank: CampaignInput = {
  title: "",
  subject: "",
  heading: "",
  message: "",
  imageUrl: "",
  imageAlt: "",
  ctaLabel: "",
  ctaPath: "",
};
const inputClass =
  "w-full rounded-xl border border-charcoal/20 bg-white px-4 py-2.5 font-body text-sm text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/20";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal hover:bg-sand/30 disabled:opacity-50 disabled:cursor-not-allowed";
function fields(campaign: Campaign | null): CampaignInput {
  return campaign
    ? {
        title: campaign.title,
        subject: campaign.subject,
        heading: campaign.heading,
        message: campaign.message,
        imageUrl: campaign.imageUrl,
        imageAlt: campaign.imageAlt,
        ctaLabel: campaign.ctaLabel,
        ctaPath: campaign.ctaPath,
      }
    : { ...blank };
}
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(!(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Unable to complete this action.");
  return data;
}
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [subscribers, setSubscribers] = useState(0),
    [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null),
    [form, setForm] = useState<CampaignInput>({ ...blank }),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [compactPreview, setCompactPreview] = useState(false);
  const query = new URLSearchParams({
    page: String(page),
    q: search,
    status,
  }).toString();
  const editorRef = useRef<HTMLElement>(null);
  const [confirm, setConfirm] = useState<
    { kind: "send" } | { kind: "switch"; campaign: Campaign | null } | null
  >(null);
  const mounted = useRef(true);
  const listRequest = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    const request = ++listRequest.current;
    try {
      const data = await api(`/api/admin/campaigns?${query}`);
      if (!mounted.current || request !== listRequest.current) return;
      setCampaigns(data.campaigns);
      setSubscribers(data.subscribers);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      if (mounted.current && request === listRequest.current)
        setError(
          error instanceof Error ? error.message : "Unable to load campaigns.",
        );
    } finally {
      if (mounted.current && request === listRequest.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    let active = true;
    const request = ++listRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api(`/api/admin/campaigns?${query}`, { signal: controller.signal })
        .then((data) => {
          if (!active || request !== listRequest.current) return;
          setCampaigns(data.campaigns);
          setSubscribers(data.subscribers);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        })
        .catch((error) => {
          if (active && request === listRequest.current)
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load campaigns.",
            );
        })
        .finally(() => {
          if (active && request === listRequest.current) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const dirty = JSON.stringify(form) !== JSON.stringify(fields(selected));
  const editable = !selected || selected.status === "DRAFT";
  function choose(campaign: Campaign | null) {
    setSelected(campaign);
    setForm(fields(campaign));
    setNotice("");
    setError("");
    setPreview(false);
  }
  function requestChoose(campaign: Campaign | null) {
    if (dirty) setConfirm({ kind: "switch", campaign });
    else choose(campaign);
    if (window.matchMedia("(max-width:1279px)").matches)
      editorRef.current?.scrollIntoView({ block: "start" });
  }
  function duplicate() {
    if (!selected || busy) return;
    const copy = { ...form, title: `${form.title.slice(0, 93)} (copy)` };
    choose(null);
    setForm(copy);
    setNotice("Copied into a new draft. Save and review it before sending.");
  }
  async function perform(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : "Unable to complete this action.",
        );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function save() {
    await perform("Saving draft…", async () => {
      const data = await api(
        selected
          ? `/api/admin/campaigns/${selected.id}`
          : "/api/admin/campaigns",
        {
          method: selected ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            ...(selected ? { version: selected.version } : {}),
          }),
        },
      );
      setSelected(data.campaign);
      setForm(fields(data.campaign));
      setNotice("Draft saved. Preview it or send a test to your admin email.");
      await load();
    });
  }
  async function upload(file: File) {
    if (
      file.size === 0 ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Choose a JPG, PNG or WebP image up to 5 MB.");
      return;
    }
    await perform("Uploading image…", async () => {
      const data = new FormData();
      data.append("file", file);
      const result = await api("/api/admin/campaigns/upload", {
        method: "POST",
        body: data,
      });
      setForm((previous) => ({
        ...previous,
        imageUrl: result.url,
        imageAlt: previous.imageAlt || previous.heading,
      }));
    });
  }
  async function test() {
    if (!selected) return;
    await perform("Sending test…", async () => {
      const data = await api(`/api/admin/campaigns/${selected.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "test" }),
      });
      setNotice(data.message);
    });
  }
  async function send() {
    if (!selected) return;
    const campaign = selected;
    await perform("Sending batches…", async () => {
      if (campaign.status === "DRAFT")
        await api(`/api/admin/campaigns/${campaign.id}`, {
          method: "POST",
          body: JSON.stringify({
            action: "queue",
            confirm: true,
            version: campaign.version,
          }),
        });
      while (mounted.current) {
        const data = await api(`/api/admin/campaigns/${campaign.id}`, {
          method: "POST",
          body: JSON.stringify({ action: "deliver" }),
        });
        if (!mounted.current) break;
        setSelected(data.campaign);
        setForm(fields(data.campaign));
        if (
          data.halted ||
          data.claimed === 0 ||
          data.campaign.status === "COMPLETED"
        ) {
          setNotice(
            data.campaign.status === "COMPLETED"
              ? "Campaign finished. Sent and skipped counts are shown below."
              : "Sending paused. Check the delivery counts and resume when ready.",
          );
          break;
        }
      }
      if (mounted.current) await load();
    });
  }
  const counts = selected?.counts;
  return (
    <AdminPage>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <AdminPageHeader
          title="Promotional emails"
          eyebrow="Customer updates"
          description="Create offers and tea updates for customers who choose to subscribe."
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-charcoal/10 bg-white px-4 py-2.5 font-body text-sm text-charcoal">
            {subscribers} eligible subscribers
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={!!busy}
            onClick={() => requestChoose(null)}
          >
            <Plus size={16} />
            New draft
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-4 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 font-body text-sm text-sage">
          {notice}
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-charcoal/10 bg-white p-4">
        <div inert={!!busy}>
          <AdminSearch
            value={search}
            placeholder="Search campaign name or subject..."
            onChange={(value) => {
              setSearch(value.slice(0, 150));
              setPage(1);
              setLoading(true);
            }}
          />
        </div>
        <CustomSelect
          id="campaign-status"
          triggerClassName="w-full min-w-[170px] cursor-pointer rounded-full border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal outline-none focus-visible:border-sage focus-visible:ring-2 focus-visible:ring-sage/20 sm:w-44"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
            setLoading(true);
          }}
          options={[
            { value: "", label: "All campaigns" },
            { value: "DRAFT", label: "Drafts" },
            { value: "QUEUED", label: "Queued" },
            { value: "COMPLETED", label: "Completed" },
          ]}
          disabled={!!busy}
        />
        <button
          type="button"
          className="font-body text-xs text-sage disabled:invisible"
          disabled={!!busy || (!search && !status)}
          onClick={() => {
            setSearch("");
            setStatus("");
            setPage(1);
            setLoading(true);
          }}
        >
          Clear filters
        </button>
        <span
          className="ml-auto font-body text-xs text-charcoal/50"
          role="status"
        >
          {loading
            ? "Loading..."
            : `${total} campaign${total === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
        <section
          aria-label="Campaign history"
          className="order-first min-w-0 rounded-2xl border border-charcoal/10 bg-white p-5 xl:order-1"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-charcoal">Campaigns</h2>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 font-body text-sm text-sage disabled:cursor-not-allowed"
              disabled={!!busy || loading}
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="font-body text-sm text-charcoal/50">
              Loading campaigns…
            </p>
          ) : campaigns.length === 0 ? (
            <p className="font-body text-sm text-charcoal/50">
              {search || status
                ? "No campaigns match your filters."
                : "No campaigns yet. Save your first draft to begin."}
            </p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  disabled={!!busy}
                  aria-pressed={selected?.id === campaign.id}
                  aria-controls="campaign-editor"
                  onClick={() => requestChoose(campaign)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${selected?.id === campaign.id ? "border-sage bg-sage/5" : "border-charcoal/10 hover:border-sage/50"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0 break-words font-body text-sm font-medium text-charcoal">
                      {campaign.title}
                    </span>
                    {selected?.id === campaign.id ? (
                      <Check size={15} className="shrink-0 text-sage" />
                    ) : (
                      <ChevronRight
                        size={15}
                        className="shrink-0 text-charcoal/40"
                      />
                    )}
                  </span>
                  <span className="mt-1 block truncate font-body text-xs text-charcoal/50">
                    {campaign.subject}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 font-body text-[11px]">
                    <span
                      className={`rounded-full px-2 py-1 ${campaign.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : campaign.status === "QUEUED" ? "bg-amber-50 text-amber-800" : "bg-sage/10 text-sage"}`}
                    >
                      {campaign.status === "COMPLETED"
                        ? "Completed"
                        : campaign.status === "QUEUED"
                          ? "Queued"
                          : "Draft"}
                    </span>
                    <span className="text-charcoal/50">
                      {campaign.counts.sent} sent
                    </span>
                    {(campaign.counts.failed > 0 ||
                      campaign.counts.unknown > 0) && (
                      <span className="text-amber-700">Needs attention</span>
                    )}
                    <span className="ml-auto text-charcoal/40">
                      {new Date(campaign.createdAt).toLocaleDateString(
                        "en-PH",
                        {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Manila",
                        },
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="font-body text-xs text-charcoal/60 disabled:opacity-40"
              disabled={page === 1 || !!busy}
              onClick={() => {
                setLoading(true);
                setPage((previous) => previous - 1);
              }}
            >
              Previous
            </button>
            <span className="font-body text-xs text-charcoal/50">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="font-body text-xs text-charcoal/60 disabled:opacity-40"
              disabled={page >= totalPages || !!busy}
              onClick={() => {
                setLoading(true);
                setPage((previous) => previous + 1);
              }}
            >
              Next
            </button>
          </div>
        </section>
        <section
          ref={editorRef}
          id="campaign-editor"
          className="min-w-0 scroll-mt-20 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6 xl:order-2"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl text-charcoal">
              {selected ? selected.title : "New campaign"}
            </h2>
            <span
              className={`rounded-full px-3 py-1 font-body text-xs ${dirty ? "bg-amber-50 text-amber-800" : "bg-sage/10 text-sage"}`}
            >
              {dirty
                ? "Unsaved changes"
                : selected?.status === "COMPLETED"
                  ? "Completed"
                  : selected?.status === "QUEUED"
                    ? "Queued"
                    : "Draft"}
            </span>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-full bg-sand/40 p-1"
              role="group"
              aria-label="Editor view"
            >
              <button
                type="button"
                aria-pressed={!preview}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm ${!preview ? "bg-white text-charcoal" : "text-charcoal/50"}`}
                onClick={() => setPreview(false)}
              >
                <FileText size={15} />
                Content
              </button>
              <button
                type="button"
                aria-pressed={preview}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm ${preview ? "bg-white text-charcoal" : "text-charcoal/50"}`}
                onClick={() => setPreview(true)}
              >
                <Eye size={15} />
                Preview
              </button>
            </div>
            {selected && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-body text-xs text-sage disabled:opacity-40"
                disabled={!!busy || dirty}
                onClick={duplicate}
              >
                <Copy size={14} />
                Copy as new draft
              </button>
            )}
          </div>
          {!editable && (
            <p className="mb-4 rounded-xl bg-sand/30 p-3 font-body text-xs leading-relaxed text-charcoal/60">
              This campaign is read-only after queueing. Copy it as a new draft
              to create another email.
            </p>
          )}
          <ValidatedForm
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset
              disabled={!editable || !!busy}
              hidden={preview}
              className="space-y-4 disabled:opacity-70"
            >
              {(["title", "subject", "heading"] as const).map((key) => (
                <label
                  key={key}
                  className="block font-body text-xs text-charcoal/60"
                >
                  <span className="mb-1.5 block">
                    {key === "title"
                      ? "Campaign name (for admins)"
                      : key === "subject"
                        ? "Email subject"
                        : "Email header (title inside the email)"}
                  </span>
                  <input
                    required
                    maxLength={key === "title" ? 100 : 150}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
              <label className="block font-body text-xs text-charcoal/60">
                <span className="mb-1.5 flex items-center justify-between">
                  Message{" "}
                  <span className="text-charcoal/40">
                    {form.message.length.toLocaleString()} / 5,000
                  </span>
                </span>
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={form.message}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <details className="group rounded-xl border border-charcoal/10 p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-body text-sm text-charcoal [&::-webkit-details-marker]:hidden">
                  <ImagePlus size={16} className="text-sage" />
                  Campaign image
                  <span className="ml-auto text-xs text-charcoal/50">
                    {form.imageUrl ? "Image attached" : "Optional"}
                  </span>
                  <ChevronRight
                    size={14}
                    className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  />
                </summary>
                <div className="mt-3">
                  <p className="mb-3 font-body text-xs text-charcoal/50">
                    Text-only emails work too. JPG, PNG or WebP, up to 5 MB.
                  </p>
                  {form.imageUrl && (
                    <div className="mb-3">
                      <div className="relative h-52 w-full">
                        <Image
                          fill
                          unoptimized
                          sizes="(min-width:1280px) 50vw, 100vw"
                          src={form.imageUrl}
                          alt={
                            form.imageAlt || form.heading || "Campaign image"
                          }
                          className="rounded-xl object-contain object-left"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-1 font-body text-xs text-charcoal/60 hover:text-charcoal"
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            imageUrl: "",
                            imageAlt: "",
                          }))
                        }
                      >
                        <X size={14} />
                        Remove image
                      </button>
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus-within:ring-2 focus-within:ring-sage">
                    <ImagePlus size={16} />
                    {form.imageUrl ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void upload(file);
                      }}
                    />
                  </label>
                  {form.imageUrl && (
                    <label className="mt-3 block font-body text-xs text-charcoal/60">
                      <span className="mb-1.5 block">Image description</span>
                      <input
                        maxLength={160}
                        className={inputClass}
                        value={form.imageAlt}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            imageAlt: event.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                </div>
              </details>
              <details className="group rounded-xl border border-charcoal/10 p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-body text-sm text-charcoal [&::-webkit-details-marker]:hidden">
                  <ArrowUpRight size={16} className="text-sage" />
                  Email button
                  <span className="ml-auto text-xs text-charcoal/50">
                    {form.ctaPath ? "Button added" : "Optional"}
                  </span>
                  <ChevronRight
                    size={14}
                    className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  />
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block font-body text-xs text-charcoal/60">
                    <span className="mb-1.5 block">
                      Button label (optional)
                    </span>
                    <input
                      maxLength={60}
                      className={inputClass}
                      placeholder="Shop the collection"
                      value={form.ctaLabel}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          ctaLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block font-body text-xs text-charcoal/60">
                    <span className="mb-1.5 block">
                      Button link on your site (optional)
                    </span>
                    <input
                      maxLength={300}
                      className={inputClass}
                      placeholder="/shop"
                      value={form.ctaPath}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          ctaPath: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </details>
            </fieldset>
            {preview && (
              <div className="rounded-xl border border-charcoal/10 bg-sand/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-body text-xs text-charcoal/50">
                    Preview of current content
                  </span>
                  <div
                    className="flex gap-1"
                    role="group"
                    aria-label="Preview width"
                  >
                    <button
                      type="button"
                      aria-label="Desktop preview"
                      aria-pressed={!compactPreview}
                      className={`rounded-lg p-2 ${!compactPreview ? "bg-white text-sage" : "text-charcoal/50"}`}
                      onClick={() => setCompactPreview(false)}
                    >
                      <Monitor size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Mobile preview"
                      aria-pressed={compactPreview}
                      className={`rounded-lg p-2 ${compactPreview ? "bg-white text-sage" : "text-charcoal/50"}`}
                      onClick={() => setCompactPreview(true)}
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>
                </div>
                <iframe
                  title="Promotional email preview"
                  sandbox=""
                  className={`mx-auto h-[500px] w-full rounded-lg bg-white ${compactPreview ? "max-w-[375px]" : ""}`}
                  srcDoc={
                    campaignEmail(
                      form,
                      process.env.NEXT_PUBLIC_SITE_URL ||
                        (typeof window !== "undefined"
                          ? window.location.origin
                          : "https://example.com"),
                      null,
                    ).html
                  }
                />
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {editable && !preview && (
                <button
                  type="submit"
                  disabled={!!busy || (!dirty && !!selected)}
                  className="rounded-full bg-sage px-5 py-2.5 font-body text-sm text-white hover:bg-charcoal disabled:opacity-50"
                >
                  Save draft
                </button>
              )}
              <button
                type="button"
                className={buttonClass}
                disabled={!!busy || !selected || dirty}
                onClick={() => void test()}
              >
                Send test to me
              </button>
              {selected?.status !== "COMPLETED" && (
                <button
                  type="button"
                  disabled={
                    !!busy ||
                    !selected ||
                    dirty ||
                    (selected.status === "DRAFT" && subscribers === 0)
                  }
                  className={buttonClass}
                  onClick={() =>
                    selected?.status === "DRAFT"
                      ? setConfirm({ kind: "send" })
                      : void send()
                  }
                >
                  <Send size={16} />
                  {selected?.status === "QUEUED"
                    ? "Resume sending"
                    : "Send campaign"}
                </button>
              )}
              {dirty && selected && editable && (
                <button
                  type="button"
                  className="font-body text-xs text-charcoal/50 underline underline-offset-4 disabled:opacity-40"
                  disabled={!!busy}
                  onClick={() => requestChoose(selected)}
                >
                  Discard changes
                </button>
              )}
            </div>
          </ValidatedForm>
          <p className="mt-3 font-body text-xs leading-relaxed text-charcoal/50">
            Save changes before testing or sending. Test emails go only to your
            own admin email address.
          </p>
          {busy && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 font-body text-sm text-sage"
            >
              <LoaderCircle
                size={15}
                className="animate-spin motion-reduce:animate-none"
              />
              {busy}
              {busy === "Sending batches…" &&
                " Keep this page open; you can resume later."}
            </p>
          )}
          {counts && (
            <div className="mt-5 border-t border-charcoal/10 pt-4">
              <p className="mb-3 font-body text-xs text-charcoal/50">
                Delivery activity
                <span className="ml-2 text-charcoal/40">
                  Sent means accepted by the email provider.
                </span>
              </p>
              <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {Object.entries(counts).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-body text-xs capitalize text-charcoal/50">
                      {key}
                    </dt>
                    <dd className="mt-1 font-display text-xl text-charcoal">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {(counts.unknown > 0 || counts.sending > 0) && (
                <p className="mt-3 font-body text-xs leading-relaxed text-charcoal/60">
                  An unresolved attempt may already have reached the provider.
                  After five minutes, Resume can safely check it using the same
                  send key for up to 20 hours. Older unresolved attempts stay
                  blocked; check Resend before deciding what to do.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.kind === "send"
            ? "Send this saved campaign?"
            : "Discard unsaved changes?"
        }
        description={
          confirm?.kind === "send"
            ? `This sends real promotional emails to currently eligible subscribers (${subscribers} shown). The campaign cannot be edited after queueing.`
            : "Save your draft first if you want to keep these changes."
        }
        confirmLabel={
          confirm?.kind === "send" ? "Queue and send" : "Discard changes"
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action?.kind === "send") void send();
          else if (action) choose(action.campaign);
        }}
      />
    </AdminPage>
  );
}
