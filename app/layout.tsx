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
  title: "Tea Atelier",
  description: "Where every leaf tells a story",
  icons: {
    icon: { url: "/images/favicon.png", type: "image/png" },
    apple: "/images/favicon.png",
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
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <StoreSettingsProvider>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  {children}
                  <StockErrorModal />
                  <AddedToCartModal />
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
