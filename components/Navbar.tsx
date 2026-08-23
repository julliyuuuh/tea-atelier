"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingBag, Settings, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import ConfirmDialog from "@/components/account/ConfirmDialog";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setAccountMenuOpen(false);
    setMenuOpen(false);
    router.push("/login");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sticky top-4 z-50 px-4">
      <header
        className={`max-w-6xl mx-auto bg-cream/95 backdrop-blur border border-charcoal/10 transition-all duration-300 ${
          menuOpen ? "rounded-3xl" : "rounded-full"
        } ${scrolled ? "shadow-lg shadow-charcoal/10" : "shadow-sm"}`}
      >
        <nav className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl tracking-tight text-charcoal"
          >
            Tea Atelier
          </Link>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <li
                key={link.label}
                className="relative"
                onMouseEnter={() => setHovered(link.label)}
                onMouseLeave={() => setHovered(null)}
              >
                <Link
                  href={link.href}
                  className="font-body text-sm tracking-wide uppercase text-charcoal/80 hover:text-charcoal transition-colors"
                >
                  {link.label}
                </Link>
                {hovered === link.label && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-sage"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </li>
            ))}
          </ul>

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-charcoal/80 hover:bg-sand transition-colors"
                  aria-label="Account"
                >
                  <User size={18} strokeWidth={1.5} />
                </button>

                <AnimatePresence>
                  {accountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 bg-cream border border-charcoal/10 rounded-xl shadow-lg overflow-hidden"
                    >
                      <Link
                        href="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 font-body text-sm text-charcoal/80 hover:bg-sand transition-colors"
                      >
                        <Settings size={16} strokeWidth={1.5} /> Account
                      </Link>
                      <button
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setAccountMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 font-body text-sm text-charcoal/80 hover:bg-sand transition-colors"
                      >
                        <LogOut size={16} strokeWidth={1.5} /> Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="w-9 h-9 flex items-center justify-center rounded-full text-charcoal/80 hover:bg-sand transition-colors"
                aria-label="Account"
              >
                <User size={18} strokeWidth={1.5} />
              </Link>
            )}

            <Link
              href="/cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-sage text-cream hover:bg-charcoal transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-charcoal text-cream text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block h-[1.5px] w-6 bg-charcoal"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block h-[1.5px] w-6 bg-charcoal"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block h-[1.5px] w-6 bg-charcoal"
            />
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="md:hidden overflow-hidden border-t border-charcoal/10 rounded-b-3xl"
            >
              <ul className="flex flex-col px-6 py-5 gap-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="font-display text-xl text-charcoal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-3 border-t border-charcoal/10">
                  {user ? (
                    <div>
                      <button
                        onClick={() => setAccountMenuOpen((prev) => !prev)}
                        className="flex items-center gap-2 font-body text-sm text-charcoal/80"
                      >
                        <User size={16} strokeWidth={1.5} /> Account
                      </button>

                      <AnimatePresence>
                        {accountMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-3 mt-3 pl-6">
                              <Link
                                href="/account"
                                onClick={() => {
                                  setAccountMenuOpen(false);
                                  setMenuOpen(false);
                                }}
                                className="flex items-center gap-2 font-body text-sm text-charcoal/70"
                              >
                                <Settings size={16} strokeWidth={1.5} /> Account
                              </Link>
                              <button
                                onClick={() => {
                                  setShowLogoutConfirm(true);
                                  setAccountMenuOpen(false);
                                  setMenuOpen(false);
                                }}
                                className="flex items-center gap-2 font-body text-sm text-charcoal/70"
                              >
                                <LogOut size={16} strokeWidth={1.5} /> Log Out
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 font-body text-sm text-charcoal/80"
                    >
                      <User size={16} strokeWidth={1.5} /> Account
                    </Link>
                  )}
                </li>
                <li>
                  <Link
                    href="/cart"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 font-body text-sm text-charcoal/80"
                  >
                    <ShoppingBag size={16} strokeWidth={1.5} /> Cart (
                    {totalItems})
                  </Link>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Are you sure you want to log out?"
        confirmLabel="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}