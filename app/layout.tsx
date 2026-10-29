import { BusinessProvider } from "@/lib/business-context";
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import StockErrorModal from "@/components/StockErrorModal";
import AddedToCartModal from "@/components/AddedToCartModal";
import Script from "next/script";
import { WishlistProvider } from "@/lib/wishlist-context";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { ThemeProvider } from "@/lib/theme-context";
import SkipLink from "@/components/SkipLink";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Tea Atelier", template: "%s | Tea Atelier" },
  description:
    "Small-batch matcha and loose-leaf teas, packed fresh and shipped across the Philippines.",
  icons: {
    icon: { url: "/images/favicon.png", type: "image/png" },
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <SkipLink />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <StoreSettingsProvider>
          <ThemeProvider>
            <AuthProvider>
              <BusinessProvider>
                <CartProvider>
                  <WishlistProvider>
                    {children}
                    <StockErrorModal />
                    <AddedToCartModal />
                  </WishlistProvider>
                </CartProvider>
              </BusinessProvider>
            </AuthProvider>
          </ThemeProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
