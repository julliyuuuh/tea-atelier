"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
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

  // Directs to admin dashboard if admin
  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      window.location.href = "/admin";
    }
  }, [user, isLoading]);

  if (isLoading || user?.role === "admin") {
    return null;
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Categories />
      <BestSellers />
      <WhyChooseUs />
      <PromoBanner />
      <Reviews />
      <Newsletter />
      <Footer />
    </main>
  );
}