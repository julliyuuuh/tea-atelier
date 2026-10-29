import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Tea Atelier team.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
