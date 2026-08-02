"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

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
      {/* Sidebar */}
      <aside className="w-60 bg-charcoal text-cream flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-cream/10">
          <span className="font-display text-xl block">Tea Atelier</span>
          <span className="font-body text-[10px] tracking-[0.2em] uppercase text-sage-light">
            Admin
          </span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2.5 font-body text-sm text-cream/70 hover:text-cream hover:bg-cream/5 transition-colors rounded"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-cream/10">
          <button
            onClick={handleLogout}
            className="font-body text-xs text-cream/50 hover:text-cream transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}