// app/admin/(dashboard)/cms/home/page.tsx
"use client";

import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import HeroTab from "./HeroTab";
import PromoTab from "./PromoTab";
import WhyChooseUsTab from "./WhyChooseUsTab";
import CategoriesTab from "./CategoriesTab";
import ReviewsTab from "./ReviewsTab";

const TABS = [
  "Hero",
  "Promo",
  "Why Choose Us",
  "Categories",
  "Reviews",
] as const;
type Tab = (typeof TABS)[number];

export default function AdminHomeCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Hero");
  const [visitedTabs, setVisitedTabs] = useState<Tab[]>(["Hero"]);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Homepage content"
        eyebrow="Content management"
        description="Manage your hero, categories, promotions, and homepage sections."
      />

      <ErrorBanner message={errorMessage} />

      <div className="flex flex-wrap items-center gap-2 mb-6 bg-white border border-charcoal/10 rounded-2xl p-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => {
              setActiveTab(tab);
              setVisitedTabs((previous) =>
                previous.includes(tab) ? previous : [...previous, tab],
              );
            }}
            className={`font-body text-sm px-4 py-2 rounded-full transition-colors ${
              activeTab === tab
                ? "bg-sage text-cream"
                : "text-charcoal/60 hover:text-charcoal hover:bg-sand/30"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={adminFormSurface}>
        <div className={activeTab === "Hero" ? "block" : "hidden"}>
          {visitedTabs.includes("Hero") && (
            <HeroTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Promo" ? "block" : "hidden"}>
          {visitedTabs.includes("Promo") && (
            <PromoTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Why Choose Us" ? "block" : "hidden"}>
          {visitedTabs.includes("Why Choose Us") && (
            <WhyChooseUsTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Categories" ? "block" : "hidden"}>
          {visitedTabs.includes("Categories") && (
            <CategoriesTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Reviews" ? "block" : "hidden"}>
          {visitedTabs.includes("Reviews") && (
            <ReviewsTab onError={setErrorMessage} />
          )}
        </div>
      </div>
    </AdminPage>
  );
}
