"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Missing verification token.");
      return;
    }

    fetch(`/api/verify-email?token=${token}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Something went wrong.");
      });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-8">
      <div className="max-w-sm w-full text-center">
        <a href="/" className="font-display text-2xl text-charcoal block mb-10">
          Tea Atelier
        </a>

        {status === "loading" && (
          <p className="font-body text-sm text-charcoal/60">Verifying your email...</p>
        )}

        {status === "success" && (
          <>
            <h1 className="font-display text-2xl text-charcoal mb-4">Email verified!</h1>
            <p className="font-body text-sm text-charcoal/60 mb-8">
              Your account is now fully active.
            </p>
            <Link
              href="/"
              className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-display text-2xl text-charcoal mb-4">Verification failed</h1>
            <p className="font-body text-sm text-red-600 mb-8">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}