// app/admin/(dashboard)/cms/faq/page.tsx
"use client";

import {
  AdminPage,
  AdminPageHeader,
  adminFormSurface,
} from "@/components/admin/AdminPage";
import { useState } from "react";
import { ErrorBanner } from "@/components/admin/AdminUI";
import FaqItemsTab from "./FaqItemsTab";

export default function AdminFaqCmsPage() {
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Frequently asked questions"
        eyebrow="Content management"
        description="Keep customer questions and answers clear and up to date."
      />

      <ErrorBanner message={errorMessage} />

      <div className={adminFormSurface}>
        <FaqItemsTab onError={setErrorMessage} />
      </div>
    </AdminPage>
  );
}
