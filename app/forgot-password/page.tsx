"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitted(true);
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
            Forgot Password
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-8">
            Enter your email and we'll send you a link to reset it
          </p>

          {errorMessage && (
            <p className="font-body text-sm text-red-600 text-center mb-6">
              {errorMessage}
            </p>
          )}

          {submitted ? (
            <div className="text-center">
              <p className="font-body text-sm text-charcoal/70 mb-6">
                If an account exists for that email, we've sent a link to reset your password. Check your inbox.
              </p>
              <Link
                href="/login"
                className="font-body text-sm text-sage hover:text-charcoal transition-colors"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}