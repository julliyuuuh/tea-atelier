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

  // Close the mobile drawer whenever the route changes
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
    <div className="min-h-screen flex bg-[#F4F4F2]">
      {/* Mobile top bar — visible below lg, hidden at lg+ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-charcoal text-cream flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg">Tea Atelier</span>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop — only rendered/visible when mobile drawer is open */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden fixed inset-0 bg-charcoal/50 z-40"
        />
      )}

      <aside
        className={`
          w-64 bg-charcoal text-cream flex flex-col shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          lg:static lg:translate-x-0
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-6 py-6 border-b border-cream/10 flex items-center justify-between">
          <div>
            <span className="font-display text-xl block">Tea Atelier</span>
            <span className="font-body text-[10px] tracking-[0.2em] uppercase text-sage-light">
              Admin
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1 text-cream/60 hover:text-cream"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 font-body text-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-sage/20 text-cream"
                    : "text-cream/60 hover:text-cream hover:bg-cream/5"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-cream/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center font-body text-xs text-sage-light">
              {user.email?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="font-body text-xs text-cream/60 truncate">
              {user.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 font-body text-xs text-cream/50 hover:text-cream transition-colors"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}