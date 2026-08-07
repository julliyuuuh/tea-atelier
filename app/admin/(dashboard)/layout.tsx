"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
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
      <aside className="w-64 bg-charcoal text-cream flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-cream/10">
          <span className="font-display text-xl block">Tea Atelier</span>
          <span className="font-body text-[10px] tracking-[0.2em] uppercase text-sage-light">
            Admin
          </span>
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

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
