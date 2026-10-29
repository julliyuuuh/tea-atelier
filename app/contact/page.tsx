"use client";

import {
  DEFAULT_CONTACT_CONTENT,
  contactContentError,
} from "@/lib/contact-content";
import { useStoreSettings } from "@/lib/store-settings-context";
import ValidatedForm from "@/components/ValidatedForm";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";

export default function ContactPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useStoreSettings();
  const [content, setContent] = useState(DEFAULT_CONTACT_CONTENT);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/cms/contact-page", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (
          response.ok &&
          !controller.signal.aborted &&
          !contactContentError(data.content)
        )
          setContent(data.content);
      } catch {
        // Keep the original page text available if CMS content cannot be loaded.
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-8 pt-16 pb-24">
        <div className="text-center mb-12">
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
            {content.eyebrow}
          </span>
          <h1 className="break-words font-display text-4xl text-charcoal mb-4">
            {content.heading}
          </h1>
          <p className="break-words whitespace-pre-line font-body text-charcoal/70">
            {content.intro}
          </p>
        </div>

        {authLoading ? (
          <p className="text-center font-body text-sm text-charcoal/70">
            Loading...
          </p>
        ) : !user ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center bg-sand/40 rounded-2xl p-10"
          >
            <p className="break-words font-display text-xl text-charcoal mb-2">
              {content.loginHeading}
            </p>
            <p className="break-words whitespace-pre-line font-body text-sm text-charcoal/70 mb-6">
              {content.loginBody}
            </p>
            <Link
              href="/login"
              className="inline-block rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase px-8 py-3 hover:bg-sage transition-colors"
            >
              Log In
            </Link>
          </motion.div>
        ) : submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center bg-sand/40 rounded-2xl p-10"
          >
            <p className="break-words font-display text-xl text-charcoal mb-2">
              {content.successHeading}
            </p>
            <p className="break-words whitespace-pre-line font-body text-sm text-charcoal/70">
              {content.successBody}
            </p>
          </motion.div>
        ) : (
          <ValidatedForm onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="font-body text-sm text-red-600 text-center">
                {error}
              </p>
            )}

            <div>
              <label
                htmlFor="contact-subject"
                className="font-body text-xs tracking-wide uppercase text-charcoal/70 block mb-2"
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                name="subject"
                required
                value={form.subject}
                onChange={handleChange}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="font-body text-xs tracking-wide uppercase text-charcoal/70 block mb-2"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-sage transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </ValidatedForm>
        )}

        <div className="mt-16 text-center font-body text-sm text-charcoal/70">
          {settings.store.email && <p>{settings.store.email}</p>}
          {settings.store.phone && (
            <p className="mt-1">{settings.store.phone}</p>
          )}
          {settings.store.address && (
            <p className="mt-1 whitespace-pre-line">{settings.store.address}</p>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
