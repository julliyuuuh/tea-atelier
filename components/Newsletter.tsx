"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import MarketingPreference from "@/components/account/MarketingPreference";

export default function Newsletter() {
  const { user, isLoading } = useAuth();

  return (
    <section className="bg-sand/40 border-t border-charcoal/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="max-w-xl mx-auto px-8 py-20 text-center"
      >
        <h2 className="font-display text-3xl text-charcoal mb-3">
          Stay Steeped In
        </h2>
        <p className="font-body text-sm text-charcoal/70 mb-8">
          New arrivals, seasonal blends, and stories from the atelier, straight
          to your inbox.
        </p>

        {isLoading ? (
          <p role="status" className="font-body text-sm text-charcoal/60">
            Loading email preferences...
          </p>
        ) : user?.role === "customer" ? (
          <div className="text-left">
            <MarketingPreference verified={user.isVerified} />
          </div>
        ) : (
          <div className="space-y-4 font-body text-sm text-charcoal/70">
            <p>
              Promotional emails are optional. Sign in to a verified customer
              account to choose your email preferences.
            </p>
            <Link
              href="/login?redirect=%2Faccount"
              className="inline-block cursor-pointer rounded-full border border-charcoal/20 px-6 py-3 text-charcoal hover:bg-sand/30"
            >
              Manage email preferences
            </Link>
          </div>
        )}
      </motion.div>
    </section>
  );
}
