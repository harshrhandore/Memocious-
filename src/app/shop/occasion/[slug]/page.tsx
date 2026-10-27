import { phase6Ready, config } from "@/lib/config";
import { publicPageMetadata, catalogueCanonical } from "@/lib/seo";
import { BrowseGate } from "@/components/browse-gate";
import { Shop } from "@/components/shop";
import { getTaxonomy } from "@/lib/catalogue";
import { notFound } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await BrowseGate();
  const { slug } = await params;
  if (!(await getTaxonomy()).occasions.some((t) => t.slug === slug)) notFound();
  return <Shop params={await searchParams} occasion={slug} />;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await BrowseGate();
  const { slug } = await params;
  const item = (await getTaxonomy()).occasions.find((t) => t.slug === slug);
  if (phase6Ready && !item)
    return {
      title: "Collection not found",
      robots: { index: false, follow: false },
    };
  if (phase6Ready && item)
    return publicPageMetadata({
      title: item.label,
      description: `Explore ${item.label.toLowerCase()} in the Memocious gift collection.`,
      path: catalogueCanonical(
        `/shop/occasion/${item.slug}`,
        await searchParams,
      ),
      origin: config.APP_ORIGIN,
    });
  return {
    title: item?.label ?? "Gift collection",
    alternates: { canonical: `/shop/occasion/${slug}` },
  };
}
