import { Shop } from "@/components/shop";
import { phase6Ready, config } from "@/lib/config";
import { publicPageMetadata, catalogueCanonical } from "@/lib/seo";
const legacyMetadata = {
  title: "The gift collection",
  alternates: { canonical: "/shop" },
};
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return phase6Ready
    ? publicPageMetadata({
        title: "The gift collection",
        description:
          "Explore customised gifts, bouquets and hampers. Final details are confirmed with the owner.",
        path: catalogueCanonical("/shop", await searchParams),
        origin: config.APP_ORIGIN,
      })
    : legacyMetadata;
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Shop params={await searchParams} />;
}
