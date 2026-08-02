"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-8 pt-16 pb-24">
        <div className="text-center mb-12">
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
            Get in Touch
          </span>
          <h1 className="font-display text-4xl text-charcoal mb-4">
            Contact Us
          </h1>
          <p className="font-body text-charcoal/60">
            Questions, feedback, or just want to talk tea? We'd love to hear
            from you.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center bg-sand/40 rounded-2xl p-10"
          >
            <p className="font-display text-xl text-charcoal mb-2">
              Message sent
            </p>
            <p className="font-body text-sm text-charcoal/60">
              We'll get back to you within 1-2 business days.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Message
              </label>
              <textarea
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
              className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors"
            >
              Send Message
            </button>
          </form>
        )}

        <div className="mt-16 text-center font-body text-sm text-charcoal/60">
          <p>hello@teaatelier.com</p>
          <p className="mt-1">123 Leaf Street, Quezon City, PH</p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
