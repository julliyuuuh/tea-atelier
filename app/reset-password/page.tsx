"use client";

import ValidatedForm from "@/components/ValidatedForm";
import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import {
  getPasswordError,
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      setErrorMessage(passwordError);
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
        error instanceof Error ? error.message : "Something went wrong.",
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
          <p className="font-body text-sm text-charcoal/70 text-center mb-8">
            Choose a new password for your account
          </p>

          {errorMessage && (
            <p className="font-body text-sm text-red-600 text-center mb-6">
              {errorMessage}
            </p>
          )}

          {!token ? (
            <p className="font-body text-sm text-charcoal/70 text-center">
              This reset link is missing a token. Please use the link from your
              email.
            </p>
          ) : success ? (
            <p className="font-body text-sm text-sage text-center">
              Password updated. Redirecting you to login...
            </p>
          ) : (
            <ValidatedForm
              onSubmit={handleSubmit}
              className="space-y-5"
              validateField={(field) => {
                if (field.name === "newPassword")
                  return getPasswordError(field.value);
                if (field.name === "confirmPassword") {
                  const original = field.form?.elements.namedItem(
                    "newPassword",
                  ) as HTMLInputElement | null;
                  if (original && original.value !== field.value)
                    return "Passwords do not match.";
                }
                return null;
              }}
            >
              <div>
                <label
                  htmlFor="reset-password-new-password"
                  className="font-body text-xs tracking-wide uppercase text-charcoal/70 block mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-password-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                    autoFocus
                    name="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-charcoal/20 bg-sand/20 pl-4 pr-12 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide passwords" : "Show passwords"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal/70 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <p className="font-body text-xs leading-relaxed text-charcoal/70">
                {PASSWORD_HINT}
              </p>

              <div>
                <label
                  htmlFor="reset-password-confirm-password"
                  className="font-body text-xs tracking-wide uppercase text-charcoal/70 block mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reset-password-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-charcoal/20 bg-sand/20 pl-4 pr-12 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide passwords" : "Show passwords"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal/70 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-sage transition-colors disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Reset Password"}
              </button>
            </ValidatedForm>
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
