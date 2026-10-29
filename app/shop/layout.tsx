import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Matcha, loose-leaf teas and brewing tools, packed fresh and shipped across the Philippines.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
