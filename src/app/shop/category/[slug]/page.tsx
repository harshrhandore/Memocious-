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
  if (!(await getTaxonomy()).categories.some((t) => t.slug === slug))
    notFound();
  return <Shop params={await searchParams} category={slug} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await BrowseGate();
  const { slug } = await params;
  const item = (await getTaxonomy()).categories.find((t) => t.slug === slug);
  return {
    title: item?.label ?? "Gift collection",
    alternates: { canonical: `/shop/category/${slug}` },
  };
}
