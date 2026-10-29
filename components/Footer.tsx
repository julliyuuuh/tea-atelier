"use client";
import DisplayCurrencyPicker from "@/components/DisplayCurrencyPicker";
import { useStoreSettings } from "@/lib/store-settings-context";
import { PAYMENT_OPTIONS, type PaymentOption } from "@/lib/store-settings";
import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All Products" },
      { href: "/collections", label: "Collections" },
      { href: "/wishlist", label: "Wishlist" },
      {
        href: "/account?tab=settings&section=business",
        label: "Business Purchasing",
      },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQs" },
      { href: "/account?tab=orders", label: "Track an Order" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "Our Story" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
];

export default function Footer() {
  const { settings } = useStoreSettings();
  const payments = (Object.keys(PAYMENT_OPTIONS) as PaymentOption[]).filter(
    (key) => settings.payments[key],
  );

  return (
    <footer className="bg-charcoal text-cream">
      <div className="max-w-7xl mx-auto px-8 pt-20 pb-12 grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-5 lg:col-span-4">
          <Link href="/" className="font-display text-2xl">
            {settings.store.name}
          </Link>
          <p className="mt-3 max-w-xs font-display italic text-lg leading-snug text-cream/70">
            Where every leaf tells a story.
          </p>

          <ul className="mt-8 space-y-3 font-body text-sm text-cream/70">
            {settings.store.address && (
              <li className="flex items-start gap-3">
                <MapPin
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-0.5 h-4 w-4 shrink-0 text-sage-light"
                />
                {settings.store.address}
              </li>
            )}
            {settings.store.email && (
              <li className="flex items-start gap-3">
                <Mail
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-0.5 h-4 w-4 shrink-0 text-sage-light"
                />
                <a
                  href={`mailto:${settings.store.email}`}
                  className="hover:text-sage-light transition-colors"
                >
                  {settings.store.email}
                </a>
              </li>
            )}
            {settings.store.phone && (
              <li className="flex items-start gap-3">
                <Phone
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-0.5 h-4 w-4 shrink-0 text-sage-light"
                />
                <a
                  href={`tel:${settings.store.phone.replace(/[^\d+]/g, "")}`}
                  className="hover:text-sage-light transition-colors"
                >
                  {settings.store.phone}
                </a>
              </li>
            )}
          </ul>
          <DisplayCurrencyPicker />
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7 lg:col-span-7 lg:col-start-6"
        >
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="font-body text-[11px] tracking-[0.2em] uppercase text-cream/50 mb-5">
                {column.title}
              </h4>
              <ul className="space-y-3 font-body text-sm text-cream/80">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-sage-light transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col gap-5 border-t border-cream/10 py-8 md:flex-row md:items-center md:justify-between">
          <p className="font-body text-xs text-cream/50">
            © {new Date().getFullYear()} {settings.store.name}. All rights
            reserved.
          </p>
          {payments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="sr-only">We accept</span>
              {payments.map((key) => (
                <span
                  key={key}
                  className="rounded-md border border-cream/15 px-2.5 py-1 font-body text-[11px] tracking-wide text-cream/70"
                >
                  {key === "card"
                    ? "Credit / Debit Card"
                    : key === "cod"
                      ? "Cash on Delivery"
                      : PAYMENT_OPTIONS[key]}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="pb-8 font-body text-[11px] leading-relaxed text-cream/35">
          Address data: Philippine Standard Geographic Code (PSGC), Philippine
          Statistics Authority,{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-sage-light transition-colors"
          >
            CC BY 4.0
          </a>
          . Filtered to Luzon and reduced to code and name fields.
        </p>
      </div>
    </footer>
  );
}
