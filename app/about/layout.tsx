import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description: "The people and craft behind Tea Atelier.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
