"use client";

import {
  AdminPage,
  AdminPageHeader,
  AdminScrollArea,
  AdminSearch,
} from "@/components/admin/AdminPage";
import { useState, useEffect, useCallback } from "react";
import { Mail } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import {
  ErrorBanner,
  StatChip,
  PlainHeader,
  CustomSelect,
} from "@/components/admin/AdminUI";
import Badge from "@/components/account/Badge";

const PAGE_SIZE = 10;

type AdminMessage = {
  id: number;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied";
  adminReply: string | null;
  createdAt: string;
  repliedAt: string | null;
  customerName: string;
  customerEmail: string;
};

type Stats = { total: number; new: number; replied: number };

const STATUS_OPTIONS = [
  { value: "All", label: "All Messages" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
];

const statusTone: Record<AdminMessage["status"], "sage" | "amber" | "neutral"> =
  {
    new: "amber",
    read: "neutral",
    replied: "sage",
  };

const GRID_COLS =
  "minmax(200px,2.2fr) minmax(220px,2.6fr) minmax(110px,0.9fr) minmax(120px,1fr)";

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "All") return;
    qs.set(key, String(value));
  });
  return qs.toString();
}

export default function AdminContactPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, replied: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  const loadMessages = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setErrorMessage("");
      const token = localStorage.getItem("token");
      try {
        const qs = buildQuery({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          status: filterStatus,
        });
        const res = await fetch(`/api/admin/contact?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load messages.");

        setMessages(data.messages);
        setStats(data.stats);
        setTotalPages(data.totalPages);

        if (data.messages.length === 0 && page > 1 && data.total > 0) {
          setCurrentPage(page - 1);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, filterStatus],
  );

  useEffect(() => {
    loadMessages(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loadMessages]);

  const hasActiveFilters = search !== "" || filterStatus !== "All";
  const clearFilters = () => {
    setSearch("");
    setFilterStatus("All");
  };

  const handleExpand = async (m: AdminMessage) => {
    const opening = expandedId !== m.id;
    setExpandedId(opening ? m.id : null);

    if (opening && m.status === "new") {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`/api/admin/contact/${m.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "read" }),
        });
        if (res.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === m.id ? { ...msg, status: "read" } : msg,
            ),
          );
          setStats((prev) => ({ ...prev, new: Math.max(0, prev.new - 1) }));
        }
      } catch {
        // non-critical, ignore
      }
    }
  };

  const handleReply = async (id: number) => {
    const adminReply = replyDrafts[id]?.trim();
    if (!adminReply) return;

    setSubmittingId(id);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reply", adminReply }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send reply.");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                status: "replied",
                adminReply: data.adminReply,
                repliedAt: data.repliedAt,
              }
            : msg,
        ),
      );
      setStats((prev) => ({ ...prev, replied: prev.replied + 1 }));
      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <AdminPage>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <AdminPageHeader
          title="Contact messages"
          eyebrow="Customer support"
          description="Review inquiries and keep customer conversations moving."
        />

        {/* Stat chips, always reflect the full message list, not just this page */}
        <div className="flex flex-wrap items-center gap-2">
          <StatChip label="Total Messages" value={stats.total} />
          <StatChip label="New" value={stats.new} tone="warning" />
          <StatChip label="Replied" value={stats.replied} />
        </div>
      </div>

      <ErrorBanner
        message={errorMessage}
        onRetry={() => loadMessages(currentPage)}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6 rounded-2xl border border-charcoal/10 bg-white p-5">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or subject..."
        />

        <CustomSelect
          id="filter-status"
          value={filterStatus}
          onChange={setFilterStatus}
          options={STATUS_OPTIONS}
          triggerClassName="min-w-[170px] bg-white border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full"
        />

        <>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-body text-sm text-charcoal/60 hover:text-charcoal underline px-1"
            >
              Clear filters
            </button>
          )}
        </>
      </div>

      <AdminScrollArea label="Contact messages" minWidth={900}>
        <div
          className="grid min-h-14 items-center border-b border-charcoal/10 bg-white"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <PlainHeader label="Customer" />
          <PlainHeader label="Subject" />
          <PlainHeader label="Status" />
          <PlainHeader label="Date" />
        </div>

        {isLoading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="grid items-center py-3 border-b border-charcoal/5 last:border-0"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div className="px-5 space-y-1.5">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-40" />
              </div>
              <div className="px-5">
                <SkeletonBlock className="h-4 w-40" />
              </div>
              <div className="px-5">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
              <div className="px-5">
                <SkeletonBlock className="h-4 w-20" />
              </div>
            </div>
          ))}

        {!isLoading && (
          <>
            {messages.map((m) => (
              <div key={m.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedId === m.id}
                  aria-controls={
                    expandedId === m.id ? `message-${m.id}` : undefined
                  }
                  onClick={() => handleExpand(m)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleExpand(m);
                    }
                  }}
                  className="grid min-h-[4.5rem] items-center py-3 border-b border-charcoal/5 focus-visible:outline-2 focus-visible:outline-sage cursor-pointer hover:bg-sand/20  transition-colors overflow-hidden"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <div className="px-5 min-w-0">
                    <p className="font-body text-sm text-charcoal truncate">
                      {m.customerName}
                    </p>
                    <p className="font-body text-xs text-charcoal/50 truncate">
                      {m.customerEmail}
                    </p>
                  </div>
                  <div className="px-5 min-w-0">
                    <span className="font-body text-sm text-charcoal/70 truncate block">
                      {m.subject || "(No subject)"}
                    </span>
                  </div>
                  <div className="px-5">
                    <Badge tone={statusTone[m.status]}>{m.status}</Badge>
                  </div>
                  <div className="px-5">
                    <span className="font-body text-xs text-charcoal/50">
                      {new Date(m.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div
                    id={`message-${m.id}`}
                    className="px-5 py-5 bg-sand/10 border-b border-charcoal/5"
                  >
                    <p className="font-body text-sm text-charcoal/80 mb-4">
                      {m.message}
                    </p>

                    {m.adminReply && (
                      <div className="bg-sage/10 rounded-lg p-4 mb-4">
                        <p className="font-body text-xs uppercase tracking-wide text-sage mb-1">
                          Your reply
                        </p>
                        <p className="font-body text-sm text-charcoal/80">
                          {m.adminReply}
                        </p>
                        {m.repliedAt && (
                          <p className="font-body text-xs text-charcoal/40 mt-2">
                            Sent{" "}
                            {new Date(m.repliedAt).toLocaleDateString("en-PH")}
                          </p>
                        )}
                      </div>
                    )}

                    {m.status !== "replied" && (
                      <div
                        className="space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <textarea
                          rows={4}
                          value={replyDrafts[m.id] || ""}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder="Write your reply..."
                          className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(m.id)}
                          disabled={
                            submittingId === m.id || !replyDrafts[m.id]?.trim()
                          }
                          className="rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase px-6 py-2.5 hover:bg-charcoal transition-colors disabled:opacity-50"
                        >
                          {submittingId === m.id ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
            <Mail className="w-8 h-8 text-charcoal/20" />
            <span className="font-body text-sm text-charcoal/40">
              No messages match your filters.
            </span>
          </div>
        )}
      </AdminScrollArea>

      {!isLoading && messages.length > 0 && totalPages > 1 && (
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
    </AdminPage>
  );
}
