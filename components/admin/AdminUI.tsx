"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

/**
 * Shared admin-dashboard UI primitives, extracted from the Products page so
 * Orders, Customers, and any future admin table pages all look and behave
 * the same way. Import these instead of redefining them per page.
 */

/** Small inline banner used everywhere an alert() used to fire. */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 bg-red-50 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-body text-sm text-red-600">{message}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="font-body text-xs text-red-600 hover:text-red-700 underline shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small pill used for the summary stats row above a table. */
export function StatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "danger"
      ? "bg-red-50 text-red-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-sand/40 text-charcoal";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-3 border border-charcoal/10 ${toneClasses}`}
    >
      <span className="font-body text-lg font-semibold leading-none">
        {value}
      </span>
      <span className="font-body text-xs uppercase tracking-wide opacity-70">
        {label}
      </span>
    </div>
  );
}

export type SortDirection = "asc" | "desc";
export type SortConfig<K extends string> = { key: K; direction: SortDirection } | null;

/** Clickable column header with an active-sort chevron indicator. */
export function SortHeader<K extends string>({
  label,
  sortKeyName,
  sortConfig,
  onSort,
  align = "left",
}: {
  label: string;
  sortKeyName: K;
  sortConfig: SortConfig<K>;
  onSort: (key: K) => void;
  align?: "left" | "right";
}) {
  const isActive = sortConfig?.key === sortKeyName;
  const ariaSort = isActive
    ? sortConfig!.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <div
      role="columnheader"
      aria-sort={ariaSort as any}
      className={`px-5 py-3 ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className={`inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide px-2 py-1 -mx-2 -my-1 rounded-md transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        } ${
          isActive
            ? "text-charcoal bg-sand/50 font-semibold"
            : "text-charcoal/50 hover:text-charcoal/70"
        }`}
      >
        {label}
        {isActive &&
          (sortConfig!.direction === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          ))}
      </button>
    </div>
  );
}

export type SelectOption = { value: string; label: string };

/**
 * Custom listbox that replaces native <select> for consistent styling —
 * the browser renders a native <select>'s open dropdown itself, ignoring
 * almost all CSS on it, so it can't be made to match the rest of the UI.
 * This mirrors <select>'s behavior (single value, onChange(value)) via a
 * styled button + listbox instead, with keyboard support via
 * aria-activedescendant so DOM focus never leaves the trigger button.
 */
export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
  triggerClassName = "",
  invalid = false,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const updateCoords = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideListbox = listboxRef.current?.contains(target);
      if (!insideTrigger && !insideListbox) setOpen(false);
    };
    // capture:true so this also picks up scrolling inside any nested
    // scrollable ancestor (e.g. a slide-over panel), not just the window.
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    updateCoords();
    setOpen(true);
  };

  const commit = (index: number) => {
    const opt = options[index];
    if (opt) onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        ref={buttonRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        className={`flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
      >
        <span className={`truncate ${!selectedOption ? "text-charcoal/40" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 opacity-60" />
        </motion.span>
      </button>

      {open &&
        coords &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={listboxRef}
              role="listbox"
              id={`${id}-listbox`}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                minWidth: coords.width,
              }}
              className="z-[200] w-max max-w-xs max-h-64 overflow-y-auto bg-white border border-charcoal/10 rounded-xl shadow-lg py-1"
            >
              {options.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={opt.value}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={`px-3.5 py-2 mx-1 rounded-lg font-body text-sm cursor-pointer truncate ${
                      isSelected
                        ? "bg-sage/20 text-charcoal font-medium"
                        : isActive
                          ? "bg-sand/50 text-charcoal"
                          : "text-charcoal/80"
                    }`}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** Framer Motion variants for animated table rows (fade/slide in, collapse on exit). */
export const rowVariants = {
  initial: { opacity: 0, y: 8 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay: Math.min(i, 8) * 0.02 },
  }),
  exit: {
    opacity: 0,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    transition: { duration: 0.2 },
  },
};