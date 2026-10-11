// app/admin/(dashboard)/cms/privacy/page.tsx
"use client";

import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import PrivacyIntroTab from "./PrivacyIntroTab";
import PrivacySectionsTab from "./PrivacySectionsTab";

const TABS = ["Intro", "Sections"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPrivacyCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Intro");
  const [visitedTabs, setVisitedTabs] = useState<Tab[]>(["Intro"]);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Privacy policy content"
        eyebrow="Content management"
        description="Manage the introduction and sections of your privacy policy."
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
        <div className={activeTab === "Intro" ? "block" : "hidden"}>
          {visitedTabs.includes("Intro") && (
            <PrivacyIntroTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Sections" ? "block" : "hidden"}>
          {visitedTabs.includes("Sections") && (
            <PrivacySectionsTab onError={setErrorMessage} />
          )}
        </div>
      </div>
    </AdminPage>
  );
}
