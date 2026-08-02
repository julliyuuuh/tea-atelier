"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    console.log("Signup attempt:", { name, email, password });
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2">
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
            Create Your Account
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-10">
            Join us for early access to seasonal blends
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
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
              className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
            >
              Create Account
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
