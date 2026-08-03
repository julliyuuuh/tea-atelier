"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");

      login(data.token, data.user);
      window.location.href = "/";
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
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-body text-sm text-charcoal/70 hover:text-charcoal bg-cream/90 backdrop-blur rounded-full px-4 py-2 transition-colors md:text-cream/90 md:hover:text-cream md:bg-charcoal/20"
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      {/* Left: photo panel */}
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

      {/* Right: form */}
      <div className="flex items-center justify-center px-8 py-16 bg-cream overflow-y-auto">
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
            Create Your Account
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-8">
            Join us for early access to seasonal blends
          </p>

          {errorMessage && (
            <p className="font-body text-sm text-red-600 text-center mb-6">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>

              <div className="flex-1">
                <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Phone Number{" "}
                <span className="normal-case text-charcoal/40">(optional)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={11}
                className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="font-body text-sm text-charcoal/60 text-center mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-sage hover:text-charcoal transition-colors"
            >
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
