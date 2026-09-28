"use client";

import Link from "next/link";
import { Home, Info, Layers, HelpCircle, ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    label: "Home",
    href: "/admin/cms/home",
    icon: Home,
    description: "Hero, promo banner, why choose us, categories, reviews",
  },
  {
    label: "About",
    href: "/admin/cms/about",
    icon: Info,
    description: "Hero, story, pillars, team",
  },
  {
    label: "Collections",
    href: "/admin/cms/collections",
    icon: Layers,
    description: "Intro and collection cards",
  },
  {
    label: "FAQ",
    href: "/admin/cms/faq",
    icon: HelpCircle,
    description: "Questions and answers",
  },
  {
    label: "Privacy Policy",
    href: "/admin/cms/privacy",
    icon: ShieldCheck,
    description: "Intro and policy sections",
  },
];

export default function AdminCmsIndexPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
          Content Management
        </h1>
        <p className="font-body text-sm text-charcoal/60">
          Manage static content across your storefront's pages.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="bg-white border border-charcoal/10 rounded-xl p-6 hover:border-sage hover:shadow-sm transition-all"
            >
              <Icon className="text-sage mb-3" size={22} />
              <h2 className="font-body text-lg text-charcoal mb-1">
                {section.label}
              </h2>
              <p className="font-body text-sm text-charcoal/60">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}