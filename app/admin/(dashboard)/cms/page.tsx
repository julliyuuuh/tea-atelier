// app/admin/(dashboard)/cms/page.tsx
"use client";

import { useState } from "react";
import HeroTab from "./HeroTab";
import PromoTab from "./PromoTab";

const TABS = ["Hero", "Promo", "Why Choose Us", "Categories", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function AdminCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Hero");

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Homepage Content</h1>

      <div className="flex gap-2 border-b border-charcoal/10 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-sage text-sage"
                : "border-transparent text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1">
        <div className={activeTab === "Hero" ? "block" : "hidden"}>
          <HeroTab />
        </div>
        <div className={activeTab === "Promo" ? "block" : "hidden"}>
          <PromoTab />
        </div>
        <div className={activeTab === "Why Choose Us" ? "block" : "hidden"}>
          <p className="text-sm text-charcoal/50">Coming soon.</p>
        </div>
        <div className={activeTab === "Categories" ? "block" : "hidden"}>
          <p className="text-sm text-charcoal/50">Coming soon.</p>
        </div>
        <div className={activeTab === "Reviews" ? "block" : "hidden"}>
          <p className="text-sm text-charcoal/50">Coming soon.</p>
        </div>
      </div>
    </div>
  );
}