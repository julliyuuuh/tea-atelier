import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers about orders, shipping, payments and returns.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
