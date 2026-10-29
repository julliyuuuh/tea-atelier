"use client";

import { useEffect, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CollectionCard from "@/components/CollectionCard";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import { COLLECTIONS, getCollection, inCollection } from "@/lib/collections";
import type { Product } from "@/lib/products";

export default function CollectionView({ slug }: { slug: string }) {
  // The server page has already 404'd unknown slugs.
  const collection = getCollection(slug)!;
  // null while loading
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const res = await fetch("/api/products", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load products.");
        setProducts(
          (data.products as Product[]).filter(
            (product) =>
              !product.isArchived && inCollection(collection, product),
          ),
        );
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
          setFailed(true);
          setProducts([]);
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [collection]);

  const others = COLLECTIONS.filter((other) => other.slug !== slug);
  const number = COLLECTIONS.indexOf(collection) + 1;

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen">
        <Navbar />

        <nav
          aria-label="Breadcrumb"
          className="max-w-7xl mx-auto px-8 pt-8 font-body text-xs text-charcoal/70"
        >
          <Link href="/" className="hover:text-charcoal transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link
            href="/collections"
            className="hover:text-charcoal transition-colors"
          >
            Collections
          </Link>
          <span className="mx-2">/</span>
          <span className="text-charcoal" aria-current="page">
            {collection.name}
          </span>
        </nav>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-8 pt-6">
          <div className="relative h-[440px] md:h-[520px] overflow-hidden rounded-3xl bg-sand">
            <motion.div
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={collection.image}
                alt=""
                fill
                preload
                sizes="(min-width: 1280px) 1216px, 100vw"
                className={`object-cover ${collection.imagePosition ?? ""}`}
              />
            </motion.div>
            {/* charcoal turns light in dark mode, so the scrim is black */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent md:bg-gradient-to-r md:from-black/75 md:via-black/30" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative flex h-full max-w-xl flex-col justify-end p-8 md:justify-center md:p-14"
            >
              <span className="font-body text-xs tracking-[0.25em] uppercase text-white/75 mb-4">
                Collection {String(number).padStart(2, "0")}
              </span>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-white mb-4">
                {collection.name}
              </h1>
              <p className="font-body text-base md:text-lg leading-relaxed text-white/85 mb-8">
                {collection.tagline}
              </p>
              <a
                href="#products"
                className="group inline-flex w-fit items-center gap-3 whitespace-nowrap rounded-full bg-[#fdf6ed] px-8 py-4 font-body text-xs tracking-[0.15em] uppercase text-[#1f2621] hover:bg-sage hover:text-white transition-colors"
              >
                Shop the collection
                <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>
            </motion.div>
          </div>
        </section>

        {/* Story and ritual */}
        <section className="max-w-7xl mx-auto px-8 py-16 md:py-24 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <h2 className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
              About the collection
            </h2>
            <p className="font-display text-2xl md:text-3xl leading-snug text-charcoal">
              {collection.story}
            </p>
          </motion.div>

          <div className="lg:col-span-6 lg:col-start-7">
            <h2 className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-6 block">
              The ritual
            </h2>
            <ol className="space-y-4">
              {collection.ritual.map((step, i) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-5 rounded-2xl border border-charcoal/10 bg-sand/25 p-6"
                >
                  <span className="font-display text-3xl leading-none text-sage">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl text-charcoal mb-1">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm leading-relaxed text-charcoal/70">
                      {step.copy}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Products */}
        <section
          id="products"
          className="max-w-7xl mx-auto px-8 pb-16 md:pb-24 scroll-mt-28"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10 border-t border-charcoal/10 pt-12">
            <div>
              <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-3 block">
                In this collection
              </span>
              <h2 className="font-display text-4xl text-charcoal">
                Shop {collection.name}
              </h2>
            </div>
            {products && products.length > 0 && (
              <p className="font-body text-sm text-charcoal/70">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            )}
          </div>

          {products === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
              {[0, 1, 2].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-charcoal/10 bg-sand/25 px-6 py-16 text-center">
              <h3 className="font-display text-2xl text-charcoal mb-2">
                {failed
                  ? "We couldn't load this collection"
                  : "New pieces are on their way"}
              </h3>
              <p className="font-body text-sm text-charcoal/70 mb-8">
                {failed
                  ? "Please refresh the page, or browse the full shop in the meantime."
                  : "This collection is being restocked. Explore the rest of the atelier in the meantime."}
              </p>
              <Link
                href="/shop"
                className="inline-block rounded-full bg-charcoal px-8 py-4 font-body text-xs tracking-[0.15em] uppercase text-cream hover:bg-sage transition-colors"
              >
                Shop all teas
              </Link>
            </div>
          )}
        </section>

        {/* Other collections */}
        <section className="max-w-7xl mx-auto px-8 pb-20 md:pb-28">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <h2 className="font-display text-3xl text-charcoal">
              Explore more collections
            </h2>
            <Link
              href="/collections"
              className="font-body text-xs tracking-[0.15em] uppercase text-charcoal/70 border-b border-charcoal/30 pb-1 hover:text-sage hover:border-sage transition-colors"
            >
              All collections
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {others.map((other) => (
              <CollectionCard
                key={other.slug}
                href={`/collections/${other.slug}`}
                name={other.name}
                tagline={other.tagline}
                image={other.image}
                imagePosition={other.imagePosition}
                className="h-72"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </MotionConfig>
  );
}
