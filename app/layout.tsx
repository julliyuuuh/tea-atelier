import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import PageTransition from "@/components/PageTransition";
import { AuthProvider } from "@/lib/auth-context";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <AuthProvider>
          <CartProvider>
            <PageTransition>{children}</PageTransition>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
