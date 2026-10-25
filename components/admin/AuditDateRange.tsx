"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

// Calendar-only values stay independent of the browser's timezone.
const todayInManila = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => new Date(`${value}T12:00:00Z`);
const pretty = (value: string) =>
  parse(value).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function AuditDateRange({
  from,
  to,
  onChange,
  label = "Audit date range",
  allowClear = true,
}: {
  label?: string;
  allowClear?: boolean;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<"from" | "to">("from");
  const [month, setMonth] = useState(() =>
    (from || todayInManila()).slice(0, 7),
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const first = parse(`${month}-01`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const today = todayInManila();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  function choose(value: string) {
    if (active === "from") {
      onChange(value, to && to < value ? "" : to);
      setActive("to");
    } else {
      onChange(from && from <= value ? from : value, value);
      close();
    }
  }
  function preset(days: number) {
    const start = parse(today);
    start.setUTCDate(start.getUTCDate() - days + 1);
    onChange(dateValue(start), today);
    close();
  }
  const dayClass =
    "flex aspect-square items-center justify-center rounded-full text-xs transition outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2";
  return (
    <div
      ref={root}
      className="relative w-full sm:w-auto [&_button]:cursor-pointer"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) {
            setMonth((from || to || today).slice(0, 7));
            setActive("from");
          }
          setOpen(!open);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-charcoal/20 bg-white px-4 py-2.5 font-body text-sm text-charcoal outline-none transition hover:border-sage focus-visible:ring-2 focus-visible:ring-sage/40"
      >
        <CalendarDays
          size={16}
          className="shrink-0 text-sage"
          aria-hidden="true"
        />
        <span>
          {from && to
            ? `${pretty(from)} – ${pretty(to)}`
            : from
              ? `From ${pretty(from)}`
              : to
                ? `Until ${pretty(to)}`
                : "Choose date range"}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-sage transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={id}
          className="absolute left-0 top-full z-30 mt-2 w-[300px] max-w-[calc(100vw-3rem)] rounded-2xl border border-charcoal/15 bg-white p-4 font-body text-charcoal"
          role="group"
          aria-label={label}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-heading text-lg">Date range</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close calendar"
              className="rounded-full p-1.5 text-charcoal/50 hover:bg-sand/30"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((part) => (
              <button
                key={part}
                type="button"
                aria-pressed={active === part}
                onClick={() => {
                  setActive(part);
                  const value = part === "from" ? from : to;
                  if (value) setMonth(value.slice(0, 7));
                }}
                className={`rounded-xl border px-3 py-2 text-left ${active === part ? "border-sage bg-sage/10" : "border-charcoal/10 bg-sand/20"}`}
              >
                <span className="block text-[11px] text-charcoal/50">
                  {part === "from" ? "From" : "To"}
                </span>
                <span className="text-xs">
                  {(part === "from" ? from : to)
                    ? pretty(part === "from" ? from : to)
                    : "Select date"}
                </span>
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              className="rounded-full p-2 hover:bg-sand/40"
              onClick={() => {
                const date = parse(`${month}-01`);
                date.setUTCMonth(date.getUTCMonth() - 1);
                setMonth(dateValue(date).slice(0, 7));
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span aria-live="polite" className="text-sm font-medium">
              {first.toLocaleDateString("en-PH", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              className="rounded-full p-2 hover:bg-sand/40"
              onClick={() => {
                const date = parse(`${month}-01`);
                date.setUTCMonth(date.getUTCMonth() + 1);
                setMonth(dateValue(date).slice(0, 7));
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span
                key={day}
                className="pb-2 text-center text-[11px] text-charcoal/40"
              >
                {day}
              </span>
            ))}
            {Array.from({ length: first.getUTCDay() }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const value = `${month}-${String(i + 1).padStart(2, "0")}`;
              const endpoint = value === from || value === to;
              const within = from && to && value > from && value < to;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={pretty(value)}
                  aria-pressed={endpoint}
                  aria-current={value === today ? "date" : undefined}
                  onClick={() => choose(value)}
                  className={`${dayClass} ${endpoint ? "bg-sage text-white" : within ? "bg-sage/10 text-charcoal" : value === today ? "border border-sage text-sage hover:bg-sage/10" : "hover:bg-sand/50"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal/10 pt-3">
            {[
              ["Today", 1],
              ["7 days", 7],
              ["30 days", 30],
            ].map(([label, days]) => (
              <button
                key={label}
                type="button"
                onClick={() => preset(Number(days))}
                className="rounded-full border border-charcoal/10 px-3 py-1.5 text-xs text-sage hover:bg-sage/10"
              >
                {label}
              </button>
            ))}
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange("", "");
                  close();
                }}
                className="ml-auto px-1 text-xs text-charcoal/50 hover:text-charcoal"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] text-charcoal/40">
            Inclusive dates · Manila time
          </p>
        </div>
      )}
    </div>
  );
}
