"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StorePromises from "@/components/StorePromises";
import Categories from "@/components/Categories";
import BestSellers from "@/components/BestSellers";
import WhyChooseUs from "@/components/WhyChooseUs";
import PromoBanner from "@/components/PromoBanner";
import Reviews from "@/components/Reviews";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Directs to admin dashboard if admin
  useEffect(() => {
    if (!isLoading && isAdmin) {
      window.location.href = "/admin";
    }
  }, [isAdmin, isLoading]);

  // Visitors see the storefront right away; only a confirmed admin is held
  // back while the redirect happens.
  if (isAdmin) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen">
        <Navbar />
        <Hero />
        <StorePromises />
        <Categories />
        <BestSellers />
        <WhyChooseUs />
        <PromoBanner />
        <Reviews />
        <Newsletter />
        <Footer />
      </main>
    </MotionConfig>
  );
}
