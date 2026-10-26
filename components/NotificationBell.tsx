"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Notification = {
  notification_id: string;
  order_id: number | null;
  href?: string | null;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export default function NotificationBell() {
  const { user } = useAuth();
  return user ? <CustomerNotifications key={user.email} /> : null;
}

function CustomerNotifications() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.any([current.signal, AbortSignal.timeout(15000)]),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load notifications.");
      if (!current.signal.aborted) {
        setItems(data.notifications);
        setUnread(data.unreadCount);
        setError("");
      }
    } catch {
      if (!current.signal.aborted)
        setError("Could not load notifications. Please try again.");
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(onVisible, 30000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      controller.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(notificationId?: string) {
    if (marking) return;
    setMarking(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(
          notificationId ? { notificationId } : { all: true },
        ),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error("Unable to mark notifications as read.");
      await refresh();
    } catch {
      setError("Could not mark notifications as read. Please try again.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-transparent text-charcoal/80 transition-colors hover:border-charcoal/10 hover:bg-sand"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void refresh();
        }}
      >
        <Bell size={18} strokeWidth={1.5} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-sage px-1 text-[10px] text-cream"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.section
            id={panelId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            aria-label="Notifications"
            className="fixed left-4 right-4 top-20 z-[60] overflow-hidden rounded-xl border border-charcoal/10 bg-cream shadow-lg md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96"
          >
            <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 p-4">
              <h2 className="font-display text-lg text-charcoal">
                Notifications
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={marking || !unread}
                  onClick={() => void markRead()}
                  className="font-body text-xs text-sage hover:underline disabled:opacity-50"
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {error && (
              <div
                role="alert"
                className="px-4 pt-4 font-body text-sm text-red-700"
              >
                {error}{" "}
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="underline"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="max-h-[65vh] overflow-y-auto">
              {loading ? (
                <p
                  role="status"
                  className="p-5 font-body text-sm text-charcoal/60"
                >
                  Loading notifications…
                </p>
              ) : !items.length && !error ? (
                <p className="p-5 font-body text-sm text-charcoal/60">
                  No notifications yet. Your order updates will appear here.
                </p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <li
                      key={item.notification_id}
                      className={`border-b border-charcoal/10 last:border-0 ${item.read_at ? "" : "bg-sand/40"}`}
                    >
                      <Link
                        href={
                          item.href?.startsWith("/account") &&
                          !item.href.startsWith("//")
                            ? item.href
                            : item.order_id
                              ? `/account/orders/${item.order_id}`
                              : "/account?tab=settings&section=business"
                        }
                        onClick={() => {
                          if (!item.read_at)
                            void markRead(item.notification_id);
                          setOpen(false);
                        }}
                        className="block p-4 hover:bg-sand/60"
                      >
                        <p className="flex items-center gap-2 font-body text-sm font-medium text-charcoal">
                          {!item.read_at && (
                            <span
                              aria-label="Unread"
                              className="h-2 w-2 shrink-0 rounded-full bg-sage"
                            />
                          )}
                          {item.title}
                        </p>
                        <p className="mt-1 font-body text-xs text-charcoal/70">
                          {item.message}
                        </p>
                        <time
                          dateTime={item.created_at}
                          className="mt-2 block font-body text-xs text-charcoal/50"
                        >
                          {new Date(item.created_at).toLocaleString()}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="border-t border-charcoal/10 px-4 py-3 font-body text-xs text-charcoal/50">
              Showing your latest 30 alerts.
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
