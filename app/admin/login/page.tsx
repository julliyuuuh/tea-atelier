"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminLoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = user.role === "admin" ? "/admin" : "/";
    }
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");

      if (data.user.role !== "admin") {
        setErrorMessage("This login is for administrators only.");
        setIsLoading(false);
        return;
      }

      login(data.token, data.user);
      window.location.href = "/admin";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-charcoal px-8 relative overflow-hidden">
      {/* subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(161,188,152,0.15),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-sm bg-charcoal/60 backdrop-blur rounded-3xl border border-cream/10 p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center mb-4">
            <ShieldCheck
              size={22}
              strokeWidth={1.5}
              className="text-sage-light"
            />
          </div>
          <a href="/" className="font-display text-2xl text-cream mb-1">
            Tea Atelier
          </a>
          <span className="font-body text-[10px] tracking-[0.25em] uppercase text-sage-light">
            Admin Portal
          </span>
        </div>

        <h1 className="font-body text-lg font-medium text-cream text-center mb-1">
          Restricted Access
        </h1>
        <p className="font-body text-sm text-cream/50 text-center mb-8">
          Staff sign-in only
        </p>

        {errorMessage && (
          <p className="font-body text-sm text-red-400 text-center mb-6">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-body text-xs tracking-wide uppercase text-cream/50 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-cream/15 bg-cream/5 px-4 py-3 font-body text-sm text-cream focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <div>
            <label className="font-body text-xs tracking-wide uppercase text-cream/50 block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-cream/15 bg-cream/5 px-4 py-3 font-body text-sm text-cream focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-cream hover:text-charcoal transition-colors disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="font-body text-xs text-cream/40 text-center mt-6">
          Customer?{" "}
          <a
            href="/login"
            className="text-sage-light hover:text-cream transition-colors"
          >
            Click here
          </a>
        </p>
      </motion.div>
    </main>
  );
}
