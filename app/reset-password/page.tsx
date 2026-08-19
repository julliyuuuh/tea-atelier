"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative">
      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-body text-sm text-charcoal/70 hover:text-charcoal bg-cream/90 backdrop-blur rounded-full px-4 py-2 transition-colors md:text-cream/90 md:hover:text-cream md:bg-charcoal/20"
      >
        <ArrowLeft size={16} /> Back to Login
      </Link>

      <div className="relative hidden md:block">
        <img
          src="/images/login-photo.jpg"
          alt="Tea Atelier"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-cream">
          <span className="font-display text-3xl mb-2">Tea Atelier</span>
          <span className="font-body text-sm text-cream/80">
            Where every leaf tells a story
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-16 bg-cream">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Link
            href="/"
            className="font-display text-2xl text-charcoal block text-center mb-10 md:hidden"
          >
            Tea Atelier
          </Link>

          <h1 className="font-display text-3xl text-charcoal text-center mb-2">
            Reset Password
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-8">
            Choose a new password for your account
          </p>

          {errorMessage && (
            <p className="font-body text-sm text-red-600 text-center mb-6">
              {errorMessage}
            </p>
          )}

          {!token ? (
            <p className="font-body text-sm text-charcoal/70 text-center">
              This reset link is missing a token. Please use the link from your email.
            </p>
          ) : success ? (
            <p className="font-body text-sm text-sage text-center">
              Password updated. Redirecting you to login...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>

              <div>
                <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}