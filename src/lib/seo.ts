import type { Metadata } from "next";
import type { Product } from "./domain";
export const shareImagePath = "/share-card/v1";
export function siteOrigin(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Use a clean site origin for public metadata.");
  return url.origin;
}
export function publicUrl(path: string, origin: string) {
  const base = siteOrigin(origin);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
    throw new Error("Invalid public path.");
  const url = new URL(path, base);
  if (url.origin !== base || url.hash) throw new Error("Invalid public URL.");
  return url.href;
}
export function publishedImage(path: string, origin: string) {
  if (!/^\/media\/[a-zA-Z0-9_.-]+$/.test(path) || path.includes(".."))
    return null;
  return publicUrl(path, origin);
}
export function catalogueCanonical(
  base: string,
  query: Record<string, string | string[] | undefined> = {},
) {
  const hasFilter = Object.entries(query).some(
    ([key, value]) =>
      key !== "page" &&
      key !== "limit" &&
      !(key === "sort" && value === "featured") &&
      [
        "q",
        "category",
        "occasion",
        "min",
        "max",
        "rating",
        "customizable",
        "colour",
        "lead",
        "stock",
        "combos",
        "sort",
      ].includes(key) &&
      value !== undefined &&
      value !== "",
  );
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  // Nonstandard page sizes and filtered searches point to their clean collection hub.
  if (
    hasFilter ||
    (query.limit !== undefined && query.limit !== "24") ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000
  )
    return base;
  return page > 1 ? `${base}?page=${page}` : base;
}
export function publicPageMetadata({
  title,
  description,
  path,
  origin,
  image,
}: {
  title: string;
  description: string;
  path: string;
  origin: string;
  image?: string;
}): Metadata {
  const canonical = publicUrl(path, origin),
    card = image ?? publicUrl(shareImagePath, origin);
  const url = new URL(canonical),
    photo = new URL(card);
  if (
    !/^\/(?:shop(?:\/(?:category|occasion)\/[a-z0-9-]{1,80})?|product\/[a-z0-9-]{1,80}|about|faq|contact|enterprise|privacy|shipping-returns)?$/.test(
      url.pathname,
    ) ||
    [...url.searchParams].some(
      ([key, value]) =>
        key !== "page" ||
        !/^\d+$/.test(value) ||
        Number(value) < 1 ||
        Number(value) > 10000,
    )
  )
    throw new Error("Metadata must use a public canonical path.");
  if (
    photo.origin !== siteOrigin(origin) ||
    photo.search ||
    photo.hash ||
    !(
      publishedImage(photo.pathname, origin) ||
      photo.pathname === shareImagePath
    )
  )
    throw new Error("Metadata must use a designated public image.");
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Memocious",
      locale: "en_IN",
      url: canonical,
      title: `${title} | Memocious`,
      description,
      images: [{ url: card, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Memocious`,
      description,
      images: [card],
    },
  };
}
export function productMetadata(
  p: Product,
  origin: string,
  { preview, gated }: { preview: boolean; gated: boolean },
): Metadata {
  const path = `/product/${encodeURIComponent(p.slug)}`;
  if (gated)
    return publicPageMetadata({
      title: "Gift catalogue",
      description: "Sign in to view the gift catalogue.",
      path,
      origin,
    });
  const image = !preview && !p.demo ? publishedImage(p.image, origin) : null;
  return publicPageMetadata({
    title: p.seoTitle || p.name,
    description: (p.seoDescription || p.description).slice(0, 320),
    path,
    origin,
    ...(image ? { image } : {}),
  });
}
export function productStructuredData(
  p: Product,
  origin: string,
  {
    preview,
    gated,
    ratingsReady,
  }: { preview: boolean; gated: boolean; ratingsReady: boolean },
) {
  if (preview || p.demo || gated || !/^[a-z0-9-]{1,80}$/.test(p.slug))
    return [];
  const url = publicUrl(`/product/${encodeURIComponent(p.slug)}`, origin);
  const images = [
    ...new Set(
      [p.image, ...(p.images ?? []).map((i) => i.url)]
        .map((path) => publishedImage(path, origin))
        .filter((v): v is string => !!v),
    ),
  ].slice(0, 10);
  const rating = p.avgRating === null ? null : Number(p.avgRating.toFixed(1));
  const aggregate =
    ratingsReady &&
    rating !== null &&
    Number.isFinite(rating) &&
    rating > 0 &&
    rating <= 5 &&
    Number.isSafeInteger(p.reviewCount) &&
    p.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: p.reviewCount,
          bestRating: 5,
          worstRating: 0,
        }
      : null;
  const price = p.pricePaise;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: publicUrl("/", origin),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "The collection",
          item: publicUrl("/shop", origin),
        },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
    ...(aggregate
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${url}#product`,
            url,
            name: p.name,
            description: p.description,
            ...(images.length ? { image: images } : {}),
            ...(aggregate ? { aggregateRating: aggregate } : {}),
            ...(price !== null && Number.isSafeInteger(price) && price >= 0
              ? {
                  additionalProperty: [
                    {
                      "@type": "PropertyValue",
                      name: "Provisional starting price",
                      value: `INR ${(price / 100).toFixed(2)}; final customisation and shipping require owner confirmation.`,
                    },
                  ],
                }
              : {}),
          },
        ]
      : []),
  ];
}
