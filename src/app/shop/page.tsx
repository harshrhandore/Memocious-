import { Shop } from "@/components/shop";
export const metadata = {
  title: "The gift collection",
  alternates: { canonical: "/shop" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Shop params={await searchParams} />;
}
