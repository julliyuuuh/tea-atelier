"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export default function AdminLoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
    <main
      className={`min-h-screen flex items-center justify-center px-8 relative overflow-hidden ${
        isDark ? "bg-[#202721]" : "bg-[#f4f4f2]"
      }`}
    >
      {/* subtle radial glow */}
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(161,188,152,0.15),transparent_60%)]"
            : "bg-[radial-gradient(circle_at_50%_0%,rgba(119,136,115,0.12),transparent_60%)]"
        }`}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`relative w-full max-w-sm backdrop-blur rounded-3xl border p-10 shadow-2xl ${
          isDark
            ? "bg-[#29332d]/90 border-[#c9d3c8]/20"
            : "bg-white/90 border-charcoal/10"
        }`}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center mb-4">
            <ShieldCheck
              size={22}
              strokeWidth={1.5}
              className="text-sage-light"
            />
          </div>
          <Link
            href="/"
            className={`font-display text-2xl mb-1 ${
              isDark ? "text-[#e3e9df]" : "text-charcoal"
            }`}
          >
            Tea Atelier
          </Link>
          <span className="font-body text-[10px] tracking-[0.25em] uppercase text-sage">
            Admin Portal
          </span>
        </div>

        <h1
          className={`font-body text-lg font-medium text-center mb-1 ${
            isDark ? "text-[#e3e9df]" : "text-charcoal"
          }`}
        >
          Restricted Access
        </h1>
        <p
          className={`font-body text-sm text-center mb-8 ${
            isDark ? "text-[#b9c5b7]" : "text-charcoal/60"
          }`}
        >
          Staff sign-in only
        </p>

        {errorMessage && (
          <p className="font-body text-sm text-red-400 text-center mb-6">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className={`font-body text-xs tracking-wide uppercase block mb-2 ${
                isDark ? "text-[#b9c5b7]" : "text-charcoal/60"
              }`}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 font-body text-sm focus:outline-none focus:border-sage transition-colors ${
                isDark
                  ? "border-[#c9d3c8]/22 bg-[#202721]/40 text-[#e3e9df]"
                  : "border-charcoal/20 bg-white text-charcoal"
              }`}
            />
          </div>

          <div>
            <label
              className={`font-body text-xs tracking-wide uppercase block mb-2 ${
                isDark ? "text-[#b9c5b7]" : "text-charcoal/60"
              }`}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 font-body text-sm focus:outline-none focus:border-sage transition-colors ${
                isDark
                  ? "border-[#c9d3c8]/22 bg-[#202721]/40 text-[#e3e9df]"
                  : "border-charcoal/20 bg-white text-charcoal"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-full bg-sage font-body text-sm tracking-wide uppercase py-4 transition-colors disabled:opacity-50 ${
              isDark
                ? "text-[#f0f4ed] hover:bg-[#829a7e] hover:text-[#202721]"
                : "text-cream hover:bg-charcoal"
            }`}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          className={`font-body text-xs text-center mt-6 ${
            isDark ? "text-[#aebbad]" : "text-charcoal/50"
          }`}
        >
          Customer?{" "}
          <a
            href="/login"
            className={`transition-colors ${
              isDark
                ? "text-[#a7bca2] hover:text-[#e3e9df]"
                : "text-sage hover:text-charcoal"
            }`}
          >
            Click here
          </a>
        </p>
      </motion.div>
    </main>
  );
}
