"use client";

import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import IntroTab from "./IntroTab";
import ItemsTab from "./ItemsTab";

const TABS = ["Intro", "Items"] as const;
type Tab = (typeof TABS)[number];

export default function AdminCollectionsCmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Intro");
  const [visitedTabs, setVisitedTabs] = useState<Tab[]>(["Intro"]);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Collections content"
        eyebrow="Content management"
        description="Manage the introduction and featured collection cards."
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
            <IntroTab onError={setErrorMessage} />
          )}
        </div>
        <div className={activeTab === "Items" ? "block" : "hidden"}>
          {visitedTabs.includes("Items") && (
            <ItemsTab onError={setErrorMessage} />
          )}
        </div>
      </div>
    </AdminPage>
  );
}
