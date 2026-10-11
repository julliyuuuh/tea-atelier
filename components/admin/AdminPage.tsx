"use client";

import { Search, X } from "lucide-react";
import styles from "@/components/admin/AdminPage.module.css";

/** Shared presentation only: page components retain their existing data and actions. */
export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow = "Store management",
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <header className="max-w-xl">
      <p className="font-body text-xs uppercase tracking-widest text-charcoal/50">
        {eyebrow}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 font-body text-sm leading-relaxed text-charcoal/60">
        {description}
      </p>
    </header>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="relative w-full min-w-0 shrink-0 sm:w-96">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40"
      />
      <input
        type="search"
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-full border border-charcoal/20 bg-white py-3 pl-11 pr-11 font-body text-sm text-charcoal outline-none transition-colors focus:border-sage focus:ring-2 focus:ring-sage/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-charcoal/50 transition-colors hover:bg-sand/30 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-sage"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function AdminScrollArea({
  children,
  label,
  minWidth = 800,
}: {
  children: React.ReactNode;
  label: string;
  minWidth?: number;
}) {
  return (
    <div className={styles.tableFrame}>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label={`${label}, scroll horizontally for more columns`}
        tabIndex={0}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
      <p className="border-t border-charcoal/10 px-5 py-2 font-body text-[11px] text-charcoal/40 sm:hidden">
        Swipe to view all columns
      </p>
    </div>
  );
}

export function AdminTable({
  children,
  label,
  minWidth = 800,
}: {
  children: React.ReactNode;
  label: string;
  minWidth?: number;
}) {
  return (
    <AdminScrollArea label={`${label} table`} minWidth={minWidth}>
      <div role="table" aria-label={label} className={styles.table}>
        {children}
      </div>
    </AdminScrollArea>
  );
}

export const adminFormSurface = styles.formSurface;
