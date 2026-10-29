import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="max-w-3xl mx-auto px-8 py-24 md:py-32 text-center">
        <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
          Page not found
        </span>
        <h1 className="font-display text-4xl md:text-6xl leading-tight text-charcoal mb-5">
          This leaf has drifted away
        </h1>
        <p className="font-body text-base leading-relaxed text-charcoal/65 max-w-md mx-auto mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
          Let&apos;s get you back to something good to drink.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="inline-block rounded-full bg-charcoal px-8 py-4 font-body text-xs tracking-[0.15em] uppercase text-cream hover:bg-sage transition-colors"
          >
            Shop all teas
          </Link>
          <Link
            href="/"
            className="inline-block rounded-full border border-charcoal/25 px-8 py-4 font-body text-xs tracking-[0.15em] uppercase text-charcoal hover:border-charcoal transition-colors"
          >
            Back to home
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
