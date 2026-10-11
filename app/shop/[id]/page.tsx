"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductReviews from "@/components/reviews/ProductReviews";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable, type Product } from "@/lib/products";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useStoreSettings } from "@/lib/store-settings-context";
import { SHIPPING_OPTIONS, type ShippingOption } from "@/lib/store-settings";
import { useWishlist } from "@/lib/wishlist-context";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { settings } = useStoreSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Product not found.");
        setProduct(data.product as Product);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
    return () => controller.abort();
  }, [id]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">Loading...</p>
      </main>
    );
  }

  if (errorMessage || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">
          {errorMessage || "Product not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 pt-8">
        <span className="font-body text-xs text-charcoal/50">
          <Link href="/shop" className="hover:text-charcoal transition-colors">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-charcoal">{product.name}</span>
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-16">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="self-start"
        >
          <ProductGallery
            key={product.id}
            image={product.image}
            galleryImages={product.galleryImages}
            name={product.name}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4">
            {product.category}
          </span>
          <h1 className="font-display text-4xl text-charcoal mb-4">
            {product.name}
          </h1>
          <span className="font-body text-2xl text-charcoal/80 mb-6">
            <DisplayPrice pesos={Number(product.price)} />
          </span>
          <p className="font-body text-sm text-charcoal/70 leading-relaxed mb-8">
            {product.description}
          </p>

          <span className="font-body text-xs uppercase tracking-wide mb-8">
            {!isProductAvailable(product) ? (
              <span className="text-charcoal/40">Out of Stock</span>
            ) : product.stockQuantity <= 10 ? (
              <span className="text-amber-600">Low Stock</span>
            ) : (
              <span className="text-sage">In Stock</span>
            )}
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border border-charcoal/20 overflow-hidden">
              <button
                disabled={quantity <= 1 || !isProductAvailable(product)}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                −
              </button>
              <span className="px-4 font-body text-sm text-charcoal">
                {quantity}
              </span>
              <button
                disabled={
                  !isProductAvailable(product) ||
                  quantity >= product.stockQuantity
                }
                onClick={() =>
                  setQuantity((q) => Math.min(product.stockQuantity, q + 1))
                }
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => addToCart(product, quantity)}
              disabled={
                !isProductAvailable(product) || quantity > product.stockQuantity
              }
              className="flex-1 rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/40"
            >
              {isProductAvailable(product) ? "Add to Cart" : "Out of Stock"}
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              className="w-14 h-14 rounded-full border border-charcoal/20 flex items-center justify-center hover:border-red-400 transition-colors shrink-0"
              aria-label="Toggle wishlist"
            >
              <Heart
                size={18}
                className={
                  isWishlisted(product.id)
                    ? "fill-red-500 text-red-500"
                    : "text-charcoal/60"
                }
              />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Accordion + Reviews Section */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Accordion */}
          <div className="border-t border-charcoal/10">
            <AccordionRow title="Shipping Information">
              {(Object.keys(SHIPPING_OPTIONS) as ShippingOption[])
                .filter((key) => settings.shipping[key].enabled)
                .map((key) => (
                  <p key={key} className="mb-2">
                    {SHIPPING_OPTIONS[key]}:{" "}
                    {settings.shipping[key].estimate ||
                      "Delivery estimate shown at checkout"}
                    .
                  </p>
                ))}
              {settings.freeShippingThresholdCents !== null && (
                <p>
                  Free delivery on product subtotals of at least ₱
                  {(settings.freeShippingThresholdCents / 100).toFixed(2)}.
                </p>
              )}
            </AccordionRow>
            <AccordionRow title="Materials & Care">
              Store in a cool, dry place away from direct sunlight. Reseal
              tightly after each use to preserve freshness and aroma.
            </AccordionRow>
            <AccordionRow title="30-Day Guarantee">
              Not satisfied? We offer a 30-day money-back guarantee on all
              unopened products.
            </AccordionRow>
          </div>

          <ProductReviews key={product.id} productId={product.id} />
        </div>
      </div>

      <Footer />
    </main>
  );
  function AccordionRow({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    const [open, setOpen] = useState(false);

    return (
      <div className="border-b border-charcoal/10">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-5 text-left"
        >
          <span className="font-body text-sm text-charcoal">{title}</span>
          <span className="text-charcoal/40 text-lg leading-none">
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <p className="font-body text-sm text-charcoal/60 leading-relaxed pb-5">
            {children}
          </p>
        )}
      </div>
    );
  }
}
