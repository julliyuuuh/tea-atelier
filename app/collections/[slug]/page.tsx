import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionView from "./CollectionView";
import { COLLECTIONS, getCollection } from "@/lib/collections";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COLLECTIONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = getCollection((await params).slug);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.tagline,
    openGraph: { images: [collection.image] },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  if (!getCollection(slug)) notFound();
  return <CollectionView slug={slug} />;
}
