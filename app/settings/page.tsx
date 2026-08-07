"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [setupStep, setSetupStep] = useState<"idle" | "scanning" | "confirming">("idle");
  const [qrCode, setQrCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadStatus() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/2fa/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setTotpEnabled(data.enabled);
      } catch {
        // fail silently, defaults to false
      } finally {
        setIsLoadingStatus(false);
      }
    }

    if (user) loadStatus();
  }, [user]);

  const startSetup = async () => {
    setErrorMessage("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/2fa/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start setup.");

      setQrCode(data.qrCode);
      setSetupStep("scanning");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/2fa/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code.");

      setTotpEnabled(true);
      setSetupStep("idle");
      setConfirmCode("");
      setSuccessMessage("Two-factor authentication is now enabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm("Disable two-factor authentication for your account?")) return;

    const token = localStorage.getItem("token");
    setErrorMessage("");

    try {
      const res = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to disable 2FA.");

      setTotpEnabled(false);
      setSuccessMessage("Two-factor authentication has been disabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-body text-sm text-charcoal/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <section className="max-w-2xl mx-auto px-6 md:px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-2">
          Account Settings
        </h1>
        <p className="font-body text-sm text-charcoal/60 mb-10">
          Manage your security preferences
        </p>

        {successMessage && (
          <p className="font-body text-sm text-sage mb-6">{successMessage}</p>
        )}
        {errorMessage && (
          <p className="font-body text-sm text-red-600 mb-6">{errorMessage}</p>
        )}

        <div className="border border-charcoal/10 p-6 md:p-8">
          <h2 className="font-display text-xl text-charcoal mb-2">
            Two-Factor Authentication
          </h2>
          <p className="font-body text-sm text-charcoal/60 mb-6">
            Add an extra layer of security using an authenticator app like Google Authenticator.
          </p>

          {isLoadingStatus ? (
            <p className="font-body text-sm text-charcoal/50">Loading...</p>
          ) : totpEnabled ? (
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-sage">Enabled</span>
              <button
                onClick={disable2FA}
                className="font-body text-xs uppercase tracking-wide text-red-600 hover:text-red-800 transition-colors"
              >
                Disable
              </button>
            </div>
          ) : setupStep === "idle" ? (
            <button
              onClick={startSetup}
              className="bg-sage text-cream font-body text-sm tracking-wide uppercase px-6 py-3 hover:bg-charcoal transition-colors"
            >
              Enable 2FA
            </button>
          ) : setupStep === "scanning" ? (
            <div className="space-y-4">
              <p className="font-body text-sm text-charcoal/70">
                Scan this QR code with Google Authenticator (or any compatible app), then enter the 6-digit code it generates.
              </p>
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 mx-auto border border-charcoal/10" />

              <form onSubmit={confirmSetup} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.3em] border border-charcoal/20 px-4 py-3 font-body text-lg text-charcoal outline-none focus:border-sage"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || confirmCode.length !== 6}
                    className="flex-1 bg-sage text-cream font-body text-sm tracking-wide uppercase py-3 hover:bg-charcoal transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Verifying..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSetupStep("idle");
                      setConfirmCode("");
                    }}
                    className="flex-1 border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}