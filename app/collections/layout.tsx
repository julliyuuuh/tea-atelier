import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated tea collections for every ritual.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
