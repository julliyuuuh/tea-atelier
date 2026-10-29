import type { Metadata } from "next";
import { pool } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

// Titles the tab and search result with the product itself; falls back to the
// shop title if the product can't be read.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return { title: "Shop" };
  try {
    const { rows } = await pool.query(
      "SELECT product_name, product_desc, product_image FROM products WHERE product_id = $1 AND is_archived = false",
      [id],
    );
    const product = rows[0];
    if (!product) return { title: "Product not found" };
    return {
      title: product.product_name,
      description: product.product_desc?.slice(0, 160) || undefined,
      openGraph: product.product_image
        ? { images: [product.product_image] }
        : undefined,
    };
  } catch {
    return { title: "Shop" };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
