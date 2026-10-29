"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import MarketingPreference from "@/components/account/MarketingPreference";

export default function Newsletter() {
  const { user, isLoading } = useAuth();

  return (
    <section className="max-w-7xl mx-auto px-8 pt-8 pb-20 md:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 items-center gap-10 rounded-3xl bg-sand/40 px-8 py-12 md:grid-cols-2 md:px-14 md:py-16"
      >
        <div>
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
            The Atelier Letter
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-charcoal mb-4">
            Stay steeped in
          </h2>
          <p className="font-body text-base leading-relaxed text-charcoal/70 max-w-md">
            New arrivals, seasonal blends and brewing notes from the atelier,
            sent now and then. Never spam, and you can opt out anytime.
          </p>
        </div>

        {isLoading ? (
          <p role="status" className="font-body text-sm text-charcoal/60">
            Loading email preferences...
          </p>
        ) : user?.role === "customer" ? (
          <div className="rounded-2xl bg-cream p-6">
            <MarketingPreference verified={user.isVerified} />
          </div>
        ) : (
          <div className="md:justify-self-end md:max-w-md w-full">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-full bg-charcoal px-7 py-4 font-body text-xs tracking-[0.15em] uppercase text-cream hover:bg-sage transition-colors"
              >
                Create an account
              </Link>
              <Link
                href="/login?redirect=%2Faccount"
                className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-full border border-charcoal/25 px-7 py-4 font-body text-xs tracking-[0.15em] uppercase text-charcoal hover:border-charcoal transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 font-body text-xs leading-relaxed text-charcoal/55">
              Newsletter sign-up lives in your account settings, so you stay in
              control of what we send.
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
