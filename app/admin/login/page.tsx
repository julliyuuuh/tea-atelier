"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Front-end only for now — no real auth wired up yet
    console.log("Admin login attempt:", { email, password });
    router.push("/admin");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4F4F2] px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display text-2xl text-charcoal block mb-1">
            Tea Atelier
          </span>
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage">
            Admin
          </span>
        </div>

        <div className="bg-white border border-charcoal/10 p-8">
          <h1 className="font-body text-lg font-medium text-charcoal mb-1">
            Sign in
          </h1>
          <p className="font-body text-sm text-charcoal/60 mb-8">
            Access the Tea Atelier dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-charcoal/20 px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label className="font-body text-xs text-charcoal/60 block mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-charcoal/20 px-3 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-charcoal text-cream font-body text-sm py-2.5 hover:bg-sage transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="font-body text-xs text-charcoal/40 text-center mt-6">
          Tea Atelier staff only
        </p>
      </div>
    </main>
  );
}
