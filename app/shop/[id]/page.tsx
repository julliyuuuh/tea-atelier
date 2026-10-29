"use client";
import { useBusiness } from "@/lib/business-context";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import DisplayPrice from "@/components/DisplayPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductReviews from "@/components/reviews/ProductReviews";
import StorePromises from "@/components/StorePromises";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable, stockStatus, type Product } from "@/lib/products";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useStoreSettings } from "@/lib/store-settings-context";
import { SHIPPING_OPTIONS, type ShippingOption } from "@/lib/store-settings";
import { useWishlist } from "@/lib/wishlist-context";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { settings } = useStoreSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { approved, limits, ready: limitsReady } = useBusiness();
  const perProductLimit = approved
    ? limits.business.perProduct
    : limits.standard.perProduct;
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  // On phones, keep "Add to cart" within reach once the main button scrolls away.
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    // A scroll check rather than IntersectionObserver: a fast flick can jump
    // straight past the row without it ever reporting as visible.
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setShowStickyBar(el.getBoundingClientRect().bottom < 0),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // isLoading too: the actions row only exists once the loading view is gone.
  }, [product, isLoading]);

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
        <p className="font-body text-charcoal/70">Loading...</p>
      </main>
    );
  }

  if (errorMessage || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/70">
          {errorMessage || "Product not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 pt-8">
        <span className="font-body text-xs text-charcoal/70">
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
            <span
              className={
                {
                  out: "text-charcoal/70",
                  low: "text-amber-800",
                  in: "text-sage",
                }[stockStatus(product).tone]
              }
            >
              {stockStatus(product).label}
            </span>
          </span>

          <p className="mb-3 text-xs text-charcoal/70">
            Your account allows up to {perProductLimit} units of this product,
            subject to stock.
          </p>
          <div ref={actionsRef} className="flex items-center gap-3 sm:gap-4">
            <div className="flex shrink-0 items-center rounded-full border border-charcoal/20 overflow-hidden">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= 1 || !isProductAvailable(product)}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="px-4 font-body text-sm text-charcoal"
              >
                {quantity}
              </span>
              <button
                aria-label="Increase quantity"
                disabled={
                  !isProductAvailable(product) ||
                  !limitsReady ||
                  quantity >= Math.min(product.stockQuantity, perProductLimit)
                }
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(product.stockQuantity, perProductLimit, q + 1),
                  )
                }
                className="px-4 py-3 font-body text-charcoal hover:bg-sand transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => addToCart(product, quantity)}
              disabled={
                !limitsReady ||
                !isProductAvailable(product) ||
                quantity > product.stockQuantity ||
                quantity > perProductLimit
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-charcoal text-cream font-body text-sm py-4 hover:bg-sage transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/40"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              {isProductAvailable(product) ? "Add to cart" : "Out of stock"}
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              className="w-14 h-14 rounded-full border border-charcoal/20 flex items-center justify-center hover:border-red-400 transition-colors shrink-0"
              aria-label={
                isWishlisted(product.id)
                  ? "Remove from wishlist"
                  : "Save to wishlist"
              }
              aria-pressed={isWishlisted(product.id)}
            >
              <Heart
                size={18}
                className={
                  isWishlisted(product.id)
                    ? "fill-red-500 text-red-500"
                    : "text-charcoal/70"
                }
              />
            </button>
          </div>
          <StorePromises compact />
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

      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal/10 bg-cream/95 px-4 py-3 backdrop-blur md:hidden"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base text-charcoal">
                  {product.name}
                </p>
                <p className="font-body text-sm text-charcoal/70">
                  <DisplayPrice pesos={Number(product.price) * quantity} />
                  {quantity > 1 && ` · ${quantity} items`}
                </p>
              </div>
              <button
                onClick={() => addToCart(product, quantity)}
                disabled={
                  !limitsReady ||
                  !isProductAvailable(product) ||
                  quantity > product.stockQuantity ||
                  quantity > perProductLimit
                }
                className="flex shrink-0 items-center gap-2 rounded-full bg-charcoal px-6 py-3.5 font-body text-sm text-cream hover:bg-sage transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/15 disabled:text-charcoal/70"
              >
                <ShoppingBag size={16} aria-hidden="true" />
                {isProductAvailable(product) ? "Add to cart" : "Out of stock"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <span className="text-charcoal/70 text-lg leading-none">
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <p className="font-body text-sm text-charcoal/70 leading-relaxed pb-5">
            {children}
          </p>
        )}
      </div>
    );
  }
}
