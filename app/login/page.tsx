"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const { login, user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      window.location.href = redirectTo || "/";
    }
  }, [user, authLoading, redirectTo]);

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

      if (data.user.role === "admin") {
        setErrorMessage("Administrators must sign in through the admin portal.");
        setIsLoading(false);
        return;
      }

      login(data.token, data.user);
      window.location.href = redirectTo || "/";
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
          Welcome Back
        </h1>
        <p className="font-body text-sm text-charcoal/60 text-center mb-10">
          Sign in to continue to your account
        </p>

        {errorMessage && (
          <p className="font-body text-sm text-red-600 text-center mb-6">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="text-right">
            <a
              href="#"
              className="font-body text-xs text-charcoal/50 hover:text-sage transition-colors"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="font-body text-sm text-charcoal/60 text-center mt-8">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-sage hover:text-charcoal transition-colors"
          >
            Sign up
          </a>
        </p>

        <p className="font-body text-xs text-charcoal/40 text-center mt-4">
          Administrator?{" "}
          <a
            href="/admin/login"
            className="text-sage hover:text-charcoal transition-colors"
          >
            Click here
          </a>
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}