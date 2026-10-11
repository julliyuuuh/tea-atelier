"use client";

import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import AboutHeroTab from "./AboutHeroTab";
import AboutStoryTab from "./AboutStoryTab";
import AboutPillarsTab from "./AboutPillarsTab";
import AboutTeamTab from "./AboutTeamTab";

const TABS = ["Hero", "Story", "Pillars", "Team"] as const;
type Tab = (typeof TABS)[number];

export default function AdminAboutCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Hero");
  const [visitedTabs, setVisitedTabs] = useState<Tab[]>(["Hero"]);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <AdminPage>
      <AdminPageHeader
        title="About page content"
        eyebrow="Content management"
        description="Tell your story through your hero, pillars, and team sections."
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
            <AboutHeroTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Story" ? "block" : "hidden"}>
          {visitedTabs.includes("Story") && (
            <AboutStoryTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Pillars" ? "block" : "hidden"}>
          {visitedTabs.includes("Pillars") && (
            <AboutPillarsTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Team" ? "block" : "hidden"}>
          {visitedTabs.includes("Team") && (
            <AboutTeamTab onError={setErrorMessage} />
          )}
        </div>
      </div>
    </AdminPage>
  );
}
