"use client";

import { useState } from "react";
import HeroTab from "./HeroTab";
import PromoTab from "./PromoTab";
import WhyChooseUsTab from "./WhyChooseUsTab";
import CategoriesTab from "./CategoriesTab";
import ReviewsTab from "./ReviewsTab";

const TABS = ["Hero", "Promo", "Why Choose Us", "Categories", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function AdminCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Hero");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-charcoal dark:text-[#dfe7dd] mb-6">
        Homepage Content
      </h1>

      <div className="bg-white dark:bg-[#2b342e] rounded-2xl shadow-sm border border-charcoal/10 dark:border-white/5 p-6">
        <div className="flex gap-2 border-b border-charcoal/10 dark:border-white/10 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-sage text-sage"
                  : "border-transparent text-charcoal/50 dark:text-[#aebbad] hover:text-charcoal dark:hover:text-[#dfe7dd]"
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
            <WhyChooseUsTab />
          </div>
          <div className={activeTab === "Categories" ? "block" : "hidden"}>
            <CategoriesTab />
          </div>
          <div className={activeTab === "Reviews" ? "block" : "hidden"}>
            <ReviewsTab />
          </div>
        </div>
      </div>
    </div>
  );
}