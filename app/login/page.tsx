"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Front-end only for now — no real auth wired up yet
    console.log("Login attempt:", { email, password });
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
            className="w-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
          >
            Log In
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
      </motion.div>
    </main>
  );
}
