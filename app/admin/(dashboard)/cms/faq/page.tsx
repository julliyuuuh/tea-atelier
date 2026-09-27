// app/admin/(dashboard)/cms/faq/page.tsx
"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import FaqItemsTab from "./FaqItemsTab";

export default function AdminFaqCmsPage() {
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
          FAQ Content
        </h1>
        <p className="font-body text-sm text-charcoal/60">
          Manage the questions and answers shown on your storefront's FAQ page.
        </p>
      </div>

      <ErrorBanner message={errorMessage} />

      <div className="bg-white border border-charcoal/10 rounded-xl p-6">
        <FaqItemsTab onError={setErrorMessage} />
      </div>
    </div>
  );
}