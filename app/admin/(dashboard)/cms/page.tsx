"use client";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Link from "next/link";
import {
  Home,
  Info,
  Layers,
  HelpCircle,
  ShieldCheck,
  Mail,
} from "lucide-react";

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
    label: "Contact",
    href: "/admin/cms/contact",
    icon: Mail,
    description: "Page introduction, sign-in prompt, message confirmation",
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
    <AdminPage>
      <AdminPageHeader
        title="Content management"
        eyebrow="Storefront content"
        description="Keep your storefront pages current, from the homepage to your policies."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="bg-white border border-charcoal/10 rounded-2xl p-6 hover:border-sage/50 transition-colors"
            >
              <Icon className="text-sage mb-3" size={22} />
              <h2 className="font-display text-xl text-charcoal mb-2">
                {section.label}
              </h2>
              <p className="font-body text-sm text-charcoal/60">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>
    </AdminPage>
  );
}
