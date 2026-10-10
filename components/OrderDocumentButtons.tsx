"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

export default function OrderDocumentButtons({
  orderId,
  admin = false,
}: {
  orderId: number;
  admin?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openDocument(kind: "invoice" | "packing-slip") {
    if (busy) return;
    setError("");
    // Open during the click, before awaiting the API, to avoid popup blocking.
    const preview = window.open("", "_blank");
    if (!preview) {
      setError("Allow popups for this site to open the print preview.");
      return;
    }
    preview.opener = null;
    preview.document.title = "Preparing order document";
    preview.document.body.textContent = "Preparing your document…";
    setBusy(true);
    try {
      const response = await fetch(
        admin
          ? `/api/admin/orders/${orderId}/document?type=${kind}`
          : `/api/orders/${orderId}/document`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to prepare the document.");
      }
      const html = await response.text();
      if (preview.closed) return;
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
      preview.document
        .getElementById("print-document")
        ?.addEventListener("click", () => {
          preview.focus();
          preview.print();
        });
      preview.focus();
    } catch (cause) {
      preview.close();
      setError(
        cause instanceof Error ? cause.message : "Unable to open the document.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void openDocument("invoice")}
          className="inline-flex items-center gap-2 rounded-lg border border-charcoal/15 px-3 py-2 font-body text-sm text-charcoal hover:bg-sand/40 disabled:opacity-50"
        >
          <Printer size={16} /> {busy ? "Preparing…" : "Print / Save invoice"}
        </button>
        {admin && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openDocument("packing-slip")}
            className="inline-flex items-center gap-2 rounded-lg border border-charcoal/15 px-3 py-2 font-body text-sm text-charcoal hover:bg-sand/40 disabled:opacity-50"
          >
            <Printer size={16} /> Print packing slip
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-body text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
