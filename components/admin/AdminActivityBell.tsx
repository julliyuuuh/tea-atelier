"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  RefreshCw,
  CheckCheck,
  Check,
  Mail,
  RotateCcw,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
type Item = {
  event_id: string;
  title: string;
  href: string;
  created_at: string;
  read: boolean;
};
export default function AdminActivityBell({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user } = useAuth();
  return user ? <Activity key={user.email} compact={compact} /> : null;
}
function Activity({ compact }: { compact: boolean }) {
  const panelId = useId();
  const [now, setNow] = useState(() => Date.now());
  const [items, setItems] = useState<Item[]>([]),
    [unread, setUnread] = useState(0),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [marking, setMarking] = useState(false),
    [filter, setFilter] = useState<"all" | "unread">("all");
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    controller = useRef<AbortController | null>(null),
    mutation = useRef<AbortController | null>(null),
    alive = useRef(false),
    readLock = useRef(false);
  const load = useCallback(async () => {
    if (document.hidden || readLock.current) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.any([current.signal, AbortSignal.timeout(15000)]),
      });
      const d = await r.json();
      if (!r.ok) throw Error();
      if (alive.current && !current.signal.aborted) {
        setNow(Date.now());
        setItems(d.items);
        setUnread(d.unread);
        setError("");
      }
    } catch {
      if (alive.current && !current.signal.aborted)
        setError("Notifications unavailable. Please try again.");
    } finally {
      if (alive.current && !current.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const first = window.setTimeout(() => void load(), 0);
    const visible = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(visible, 60000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      alive.current = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
      controller.current?.abort();
      mutation.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  async function read(eventId?: string) {
    if (readLock.current) return;
    readLock.current = true;
    setMarking(true);
    setError("");
    controller.current?.abort();
    setLoading(false);
    const current = new AbortController();
    mutation.current = current;
    try {
      const r = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventId ? { eventId } : { all: true }),
        signal: AbortSignal.any([current.signal, AbortSignal.timeout(15000)]),
      });
      if (!r.ok) throw Error();
      if (!alive.current || current.signal.aborted) return;
      setItems((previous) =>
        previous.map((i) =>
          !eventId || i.event_id === eventId ? { ...i, read: true } : i,
        ),
      );
      setUnread((n) => (eventId ? Math.max(0, n - 1) : 0));
      readLock.current = false;
      await load();
    } catch {
      if (alive.current && !current.signal.aborted)
        setError("Unable to mark notifications as read. Please try again.");
    } finally {
      readLock.current = false;
      if (alive.current && !current.signal.aborted) setMarking(false);
    }
  }
  const visibleItems =
    filter === "unread" ? items.filter((i) => !i.read) : items;
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function dateLabel(value: string) {
    const date = new Date(value),
      minutes = Math.floor((now - date.getTime()) / 60000);
    return minutes < 1
      ? "Just now"
      : minutes < 60
        ? `${minutes} min ago`
        : minutes < 1440
          ? `${Math.floor(minutes / 60)} hr ago`
          : date.toLocaleDateString("en-PH", {
              timeZone: "Asia/Manila",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
  }
  return (
    <div
      ref={root}
      className="relative [&_button]:cursor-pointer [&_button:disabled]:cursor-default"
    >
      <button
        ref={trigger}
        type="button"
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
        title="Notifications"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className={`relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm transition-colors hover:bg-sage/10 ${open ? "border-sage bg-sage/10" : "border-sage/30"}`}
      >
        <Bell size={18} />
        {!compact && "Notifications"}
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 min-w-4 rounded-full bg-sage px-1.5 text-center text-[10px] text-cream"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id={panelId}
          aria-label="Admin notifications"
          aria-busy={loading || marking}
          className="fixed bottom-24 left-4 z-[70] flex max-h-[min(38rem,75dvh)] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white text-charcoal shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-charcoal/10 p-4">
            <div>
              <h2 className="font-display text-xl">Notifications</h2>
              <p className="mt-1 text-xs text-charcoal/50">
                {unread
                  ? `${unread} unread ${unread === 1 ? "update" : "updates"}`
                  : "You’re all caught up"}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Refresh notifications"
                title="Refresh notifications"
                disabled={loading || marking}
                onClick={() => void load()}
                className="rounded-lg p-2 text-sage hover:bg-sage/10 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "motion-safe:animate-spin" : ""}
                />
              </button>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={close}
                className="rounded-lg p-2 text-charcoal/50 hover:bg-sage/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 px-4 py-3">
            <div
              role="group"
              aria-label="Filter notifications"
              className="flex gap-1 rounded-full bg-sage/5 p-1"
            >
              {(["all", "unread"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1 text-xs ${filter === value ? "bg-sage text-cream" : "text-charcoal/60 hover:bg-sage/10"}`}
                >
                  {value === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!unread || marking}
              onClick={() => void read()}
              className="inline-flex items-center gap-1 text-xs text-sage hover:underline disabled:opacity-40"
            >
              <CheckCheck size={14} />
              {marking ? "Updating…" : "Mark all read"}
            </button>
          </div>
          {error && (
            <div
              role="alert"
              className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700"
            >
              {error}{" "}
              <button
                type="button"
                disabled={loading || marking}
                onClick={() => void load()}
                className="underline"
              >
                Retry
              </button>
            </div>
          )}
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {loading && !items.length ? (
              <p
                role="status"
                className="p-8 text-center text-sm text-charcoal/50"
              >
                Loading notifications…
              </p>
            ) : !error && !visibleItems.length ? (
              <div className="p-8 text-center">
                <Bell size={24} className="mx-auto mb-3 text-sage/60" />
                <p className="text-sm">
                  {filter === "unread"
                    ? "No unread alerts in your latest activity."
                    : "No notifications yet."}
                </p>
                <p className="mt-1 text-xs text-charcoal/50">
                  New messages, orders and refund requests appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-charcoal/10">
                {visibleItems.map((item) => {
                  const Icon =
                    item.href === "/admin/contact"
                      ? Mail
                      : item.href === "/admin/returns"
                        ? RotateCcw
                        : ShoppingBag;
                  return (
                    <li
                      key={item.event_id}
                      className={item.read ? "" : "bg-sage/5"}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <span className="mt-0.5 rounded-xl bg-sage/10 p-2 text-sage">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (!item.read) void read(item.event_id);
                              setOpen(false);
                            }}
                            className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/40"
                          >
                            <p
                              className={`text-sm ${item.read ? "text-charcoal/60" : "font-medium"}`}
                            >
                              {item.title}
                              <ArrowUpRight
                                size={13}
                                className="ml-1 inline text-sage opacity-0 group-hover:opacity-100"
                              />
                            </p>
                            <time
                              dateTime={item.created_at}
                              title={
                                new Date(item.created_at).toLocaleString(
                                  "en-PH",
                                  { timeZone: "Asia/Manila" },
                                ) + " · Manila time"
                              }
                              className="mt-1 block text-xs text-charcoal/40"
                            >
                              {dateLabel(item.created_at)}
                            </time>
                          </Link>
                          {!item.read && (
                            <button
                              type="button"
                              disabled={marking}
                              onClick={() => void read(item.event_id)}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-sage hover:underline disabled:opacity-40"
                            >
                              <Check size={13} />
                              Mark as read
                            </button>
                          )}
                        </div>
                        {!item.read && (
                          <span
                            aria-label="Unread"
                            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sage"
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="border-t border-charcoal/10 px-4 py-3 text-[11px] text-charcoal/40">
            Latest 30 alerts · Times shown in Manila time
          </p>
        </section>
      )}
    </div>
  );
}
