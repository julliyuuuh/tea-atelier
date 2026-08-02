"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-charcoal px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <a
          href="/"
          className="font-display text-2xl text-cream block text-center mb-10"
        >
          Tea Atelier
        </a>

        <h1 className="font-display text-3xl text-cream text-center mb-2">
          Admin Sign In
        </h1>
        <p className="font-body text-sm text-cream/60 text-center mb-10">
          Restricted access — staff only
        </p>

        {errorMessage && (
          <p className="font-body text-sm text-red-400 text-center mb-6">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="font-body text-xs tracking-wide uppercase text-cream/60 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-cream/30 py-2 font-body text-sm text-cream focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <div>
            <label className="font-body text-xs tracking-wide uppercase text-cream/60 block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-cream/30 py-2 font-body text-sm text-cream focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-cream hover:text-charcoal transition-colors disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="font-body text-xs text-cream/40 text-center mt-4">
        Customer?{" "}
        <a
            href="/login"
            className="text-sage hover:text-cream transition-colors"
        >
            Click here
        </a>
        </p>
      </motion.div>
    </main>
  );
}