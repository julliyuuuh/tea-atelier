"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
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

  useEffect(() => {
    document.title = "Tea Atelier — Admin";
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/admin/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isLoading || !user || user.role !== "admin") {
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
    <div className="h-screen flex bg-[#F4F4F2] overflow-hidden">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-charcoal/10 flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg text-charcoal">Tea Atelier</span>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-charcoal"
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
        className={`
          w-64 bg-white border-r border-charcoal/10 flex flex-col shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          lg:static lg:translate-x-0 h-screen
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center font-display text-lg text-cream shrink-0">
            T
          </div>
          <div>
            <span className="font-body text-base font-semibold text-charcoal block">
              Tea Atelier
            </span>
            <span className="font-body text-[10px] tracking-[0.15em] uppercase text-charcoal/40">
              Admin
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="lg:hidden ml-auto p-1 text-charcoal/50 hover:text-charcoal"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 font-body text-sm rounded-xl transition-colors ${
                  isActive
                    ? "bg-sage text-cream font-medium shadow-sm"
                    : "text-charcoal/60 hover:text-charcoal hover:bg-sand/40"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-charcoal/10 shrink-0">
          <p className="font-body text-xs text-charcoal/50 truncate mb-3">
            {user.email}
          </p>
          <Link
            href="/"
            className="flex items-center gap-1.5 font-body text-sm text-charcoal/70 hover:text-sage transition-colors mb-3"
          >
            View storefront <ArrowUpRight size={14} />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 font-body text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}