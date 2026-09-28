// app/admin/(dashboard)/cms/privacy/page.tsx
"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import PrivacyIntroTab from "./PrivacyIntroTab";
import PrivacySectionsTab from "./PrivacySectionsTab";

const TABS = ["Intro", "Sections"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPrivacyCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Intro");
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
          Privacy Policy Content
        </h1>
        <p className="font-body text-sm text-charcoal/60">
          Manage the text shown on your storefront's Privacy Policy page.
        </p>
      </div>

      <ErrorBanner message={errorMessage} />

      <div className="flex flex-wrap items-center gap-1 mb-4 bg-white border border-charcoal/10 rounded-xl px-3 py-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
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

      <div className="bg-white border border-charcoal/10 rounded-xl p-6">
        <div className={activeTab === "Intro" ? "block" : "hidden"}>
          <PrivacyIntroTab onError={setErrorMessage} />
        </div>
        <div className={activeTab === "Sections" ? "block" : "hidden"}>
          <PrivacySectionsTab onError={setErrorMessage} />
        </div>
      </div>
    </div>
  );
}