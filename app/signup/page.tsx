"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
        body: JSON.stringify({ firstName, lastName, email, phoneNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");

      login(data.token, data.user);
      window.location.href = "/";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <a
          href="/"
          className="font-display text-2xl text-charcoal block text-center mb-10"
        >
          Tea Atelier
        </a>

        <h1 className="font-display text-3xl text-charcoal text-center mb-2">
          Create Your Account
        </h1>
        <p className="font-body text-sm text-charcoal/60 text-center mb-10">
          Join us for early access to seasonal blends
        </p>

        {errorMessage && (
          <p className="font-body text-sm text-red-600 text-center mb-6">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
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
                className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
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
              className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <div>
            <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
              Phone Number <span className="normal-case text-charcoal/40">(optional)</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
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
              className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
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
              className="w-full bg-transparent border-b border-charcoal/30 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="font-body text-sm text-charcoal/60 text-center mt-8">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-sage hover:text-charcoal transition-colors"
          >
            Log in
          </a>
        </p>
      </motion.div>
    </main>
  );
}