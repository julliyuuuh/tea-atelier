"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/cart-context";

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
  const { totalItems } = useCart();

  return (
    <header className="w-full border-b border-charcoal/10 bg-cream relative z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">
        {/* Logo */}

        <a
          href="/"
          className="font-display text-2xl tracking-tight text-charcoal"
        >
          Tea Atelier
        </a>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <li
              key={link.label}
              className="relative"
              onMouseEnter={() => setHovered(link.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <a
                href={link.href}
                className="font-body text-sm tracking-wide uppercase text-charcoal/80 hover:text-charcoal transition-colors"
              >
                {link.label}
              </a>
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

        {/* Desktop Cart + Login */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="/login"
            className="font-body text-sm tracking-wide uppercase text-charcoal/80 hover:text-charcoal transition-colors"
          >
            Login
          </a>

          <a
            href="/cart"
            className="font-body text-sm tracking-wide uppercase text-charcoal/80 hover:text-charcoal transition-colors"
          >
            Cart ({totalItems})
          </a>
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="md:hidden overflow-hidden bg-cream border-t border-charcoal/10"
          >
            <ul className="flex flex-col px-8 py-6 gap-5">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-display text-2xl text-charcoal"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="pt-4 border-t border-charcoal/10 flex gap-6">
                <a
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="font-body text-sm uppercase tracking-wide text-charcoal/80"
                >
                  Login
                </a>

                <a
                  href="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="font-body text-sm uppercase tracking-wide text-charcoal/80"
                >
                  Cart ({totalItems})
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
