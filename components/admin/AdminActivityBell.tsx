"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
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
  const [items, setItems] = useState<Item[]>([]),
    [unread, setUnread] = useState(0),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    busy = useRef(false);
  const load = useCallback(async () => {
    if (busy.current || document.hidden) return;
    busy.current = true;
    try {
      const r = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (alive.current) {
        setItems(d.items);
        setUnread(d.unread);
        setError("");
      }
    } catch {
      if (alive.current) setError("Notifications unavailable. Try refresh.");
    } finally {
      busy.current = false;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const first = setTimeout(() => void load(), 0),
      timer = setInterval(() => void load(), 60000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive.current = false;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);
  async function read(eventId?: string) {
    try {
      const r = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventId ? { eventId } : { all: true }),
      });
      if (!r.ok) throw Error();
      await load();
    } catch {
      setError("Unable to mark notifications as read.");
    }
  }
  return (
    <div>
      <button
        type="button"
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
        title="Notifications"
        className="relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-sage/30 px-3 text-sm"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          void load();
        }}
      >
        <Bell size={18} />
        {!compact && "Notifications"}{" "}
        {unread > 0 && (
          <span
            className={
              compact
                ? "absolute -right-1 -top-1 rounded-full bg-sage px-1.5 text-[10px] text-cream"
                : "rounded-full bg-sage px-2 text-cream"
            }
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label="Admin notifications"
          className="fixed bottom-20 left-4 z-50 max-h-[65vh] w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-sage/30 bg-cream p-4 text-charcoal shadow-lg"
        >
          <div className="flex items-center justify-between">
            <strong>Notifications</strong>
            <button
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="my-3 flex gap-4 text-sm">
            <button onClick={() => void load()}>Refresh</button>
            <button onClick={() => void read()}>Mark all as read</button>
          </div>
          {error && <p role="alert">{error}</p>}
          {!error && !items.length && <p>No notifications yet.</p>}
          {items.map((i) => (
            <Link
              key={i.event_id}
              href={i.href}
              onClick={() => {
                void read(i.event_id);
                setOpen(false);
              }}
              className={`my-2 block rounded-xl border border-sage/20 p-3 ${i.read ? "opacity-60" : "bg-sage/10"}`}
            >
              <p>{i.title}</p>
              <time className="text-xs">
                {new Date(i.created_at).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                })}
              </time>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
