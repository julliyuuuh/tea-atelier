"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Package,
  ShoppingBag,
  Users,
  Mail,
  FileText,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Moon,
  Sun,
  ShieldCheck,
  RotateCcw,
  History,
  Settings,
  Megaphone,
} from "lucide-react";

import AdminActivityBell from "@/components/admin/AdminActivityBell";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
  group: "Store" | "Customer updates" | "Administration";
};

const navItems: NavItem[] = [
  { group: "Store", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    group: "Store",
    label: "Sales Reports",
    href: "/admin/sales",
    icon: ChartNoAxesCombined,
  },
  { group: "Store", label: "Products", href: "/admin/products", icon: Package },
  { group: "Store", label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  {
    group: "Store",
    label: "Returns & Refunds",
    href: "/admin/returns",
    icon: RotateCcw,
  },
  { group: "Store", label: "Customers", href: "/admin/customers", icon: Users },
  {
    group: "Customer updates",
    label: "Contact Messages",
    href: "/admin/contact",
    icon: Mail,
  },
  {
    group: "Customer updates",
    label: "Promotional Emails",
    href: "/admin/campaigns",
    icon: Megaphone,
  },
  {
    group: "Administration",
    label: "Content Management",
    href: "/admin/cms",
    icon: FileText,
  },
  {
    label: "Admin Accounts",
    href: "/admin/accounts",
    icon: ShieldCheck,
    superAdminOnly: true,
    group: "Administration",
  },
  {
    label: "Audit Trail",
    href: "/admin/audit",
    icon: History,
    superAdminOnly: true,
    group: "Administration",
  },
  {
    label: "Platform Settings",
    href: "/admin/settings",
    icon: Settings,
    superAdminOnly: true,
    group: "Administration",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setMobileNavOpen(false);
  }
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!mobileNavOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [mobileNavOpen]);

  useEffect(() => {
    document.title = "Tea Atelier - Admin";
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/admin/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "super_admin") {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (
    isLoading ||
    !user ||
    (user.role !== "admin" && user.role !== "super_admin")
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F2]">
        <p className="font-body text-sm text-charcoal/60">Loading...</p>
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.push("/admin/login");
  }

  return (
    <div className="h-dvh flex bg-[#F4F4F2] dark:bg-[#202721] overflow-hidden">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-[#2b342e] border-b border-charcoal/10 flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg text-charcoal dark:text-[#dfe7dd]">
          Tea Atelier
        </span>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-sidebar"
          className="p-2 -mr-2 text-charcoal dark:text-[#dfe7dd]"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden fixed inset-0 bg-charcoal/30 z-40"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`
          w-64 bg-white dark:bg-[#2b342e] border-r border-charcoal/10 flex flex-col shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          lg:static lg:translate-x-0 h-dvh
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-5 py-4 flex items-center gap-3 border-b border-charcoal/5">
          <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center font-display text-lg text-cream shrink-0">
            T
          </div>
          <div>
            <span className="font-body text-base font-semibold text-charcoal dark:text-[#dfe7dd] block">
              Tea Atelier
            </span>
            <span className="font-body text-[10px] tracking-[0.15em] uppercase text-charcoal/40 dark:text-[#aebbad]">
              {user.role === "super_admin" ? "Super admin" : "Admin"}
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="lg:hidden ml-auto p-1 text-charcoal/50 dark:text-[#aebbad] hover:text-charcoal dark:hover:text-[#dfe7dd]"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          aria-label="Admin navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]"
        >
          {(["Store", "Customer updates", "Administration"] as const).map(
            (group) => (
              <div key={group} className="mb-3 last:mb-0">
                <p className="mb-1 px-3 font-body text-[10px] uppercase tracking-widest text-charcoal/40 dark:text-[#aebbad]">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {navItems
                    .filter(
                      (item) =>
                        item.group === group &&
                        (!item.superAdminOnly || user.role === "super_admin"),
                    )
                    .map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" &&
                          pathname.startsWith(`${item.href}/`));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-2 font-body text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-sage ${isActive ? "bg-sage text-cream dark:bg-[#71866e] dark:text-[#f0f4ed] font-medium" : "text-charcoal/60 dark:text-[#b9c5b7] hover:text-charcoal dark:hover:text-[#f0f4ed] hover:bg-sand/40 dark:hover:bg-[#354038]"}`}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            className="shrink-0"
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className="shrink-0 border-t border-charcoal/10 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/admin/profile"
              title="My profile"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 hover:bg-sage/10"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/15 font-display text-sage">
                  {(user.name || "A").charAt(0)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm text-charcoal">
                  {user.name}
                </span>
                <span
                  className="block truncate text-[11px] text-charcoal/50"
                  title={user.email}
                >
                  {user.email}
                </span>
              </span>
            </Link>
            <AdminActivityBell compact />
          </div>
          <Link
            href="/"
            className="mb-2 flex min-h-8 items-center justify-between rounded-lg px-2 font-body text-xs text-charcoal/70 dark:text-[#b9c5b7] hover:bg-sand/30 dark:hover:bg-[#354038]"
          >
            View storefront <ArrowUpRight size={14} />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-charcoal/10 px-2 font-body text-xs text-charcoal/70 dark:text-[#b9c5b7] hover:bg-sand/30 dark:hover:bg-[#354038]"
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
            <button
              onClick={handleLogout}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-charcoal/10 px-2 font-body text-xs text-charcoal/70 dark:text-[#b9c5b7] hover:bg-sand/30 dark:hover:bg-[#354038]"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
