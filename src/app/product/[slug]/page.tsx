import { Wishlist } from "@/components/wishlist";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getPublicSettings } from "@/lib/catalogue";
import { filtersSchema, money } from "@/lib/domain";
import { Gallery } from "@/components/gallery";
import { Enquiry } from "@/components/enquiry";
import { ProductCard, SectionHeading } from "@/components/ui";
import { BrowseGate } from "@/components/browse-gate";
import { writesReady, demo, phase2Ready } from "@/lib/config";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await BrowseGate();
  const p = await getProduct((await params).slug);
  return {
    title: p?.seoTitle || p?.name || "Gift not found",
    description: p?.seoDescription || p?.description,
    alternates: { canonical: `/product/${(await params).slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await BrowseGate();
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [related, settings] = await Promise.all([
    getProducts(filtersSchema.parse({ limit: 4 })),
    getPublicSettings(),
  ]);
  return (
    <>
      <div className="container page-header">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">The collection</Link>
          <span>/</span>
          <span>{p.name}</span>
        </div>
      </div>
      <div className="container product-detail">
        <Gallery
          image={p.image}
          name={p.name}
          images={p.images}
          demo={p.demo}
        />
        <div className="product-summary">
          <span className="eyebrow">A GIFT, WITH YOUR PERSONAL TOUCH</span>
          <h1>{p.name}</h1>
          <p className="product-price">
            {p.pricePaise === null ? (
              "Price on request"
            ) : (
              <>
                <small>From</small>
                {money(p.pricePaise)}
                {p.maxPricePaise !== null && p.maxPricePaise !== p.pricePaise
                  ? ` – ${money(p.maxPricePaise)}`
                  : ""}
              </>
            )}
          </p>
          <span className="rating-label">
            {p.avgRating === null
              ? "Not yet rated"
              : `${p.avgRating.toFixed(1)}/5 · ${p.reviewCount} reviews`}
          </span>
          <p className="product-description">{p.description}</p>
          <Enquiry
            product={p}
            sitekey={process.env.TURNSTILE_SITE_KEY ?? ""}
            available={!demo && writesReady && !!settings.whatsappNumber}
          />
          {phase2Ready && <Wishlist product={p.id} />}
          <div className="details-accordion">
            <details>
              <summary>The thoughtful details</summary>
              <p>{p.detail}</p>
            </details>
            <details>
              <summary>Materials &amp; dimensions</summary>
              <p>
                {p.materials}
                <br />
                {p.dimensions}
              </p>
            </details>
            <details>
              <summary>Making &amp; delivery</summary>
              <p>
                {p.lead === "ready" ? "Ready to prepare" : "Made to order"}
                {p.leadDays
                  ? ` · Usually ${p.leadDays} working days before dispatch`
                  : ""}
                {p.moq && p.moq > 1 ? ` · Minimum quantity ${p.moq}` : ""}
              </p>
              <p>
                Availability, customisation, serviceability and your requested
                date must be confirmed with the business. A requested delivery
                date is not a guarantee.
              </p>
            </details>
          </div>
        </div>
      </div>
      <section className="container section">
        <SectionHeading
          eyebrow="MORE LITTLE POSSIBILITIES"
          title="Something else to make them smile."
          link="/shop"
        />
        <div className="product-grid">
          {related.products
            .filter((r) => r.id !== p.id)
            .slice(0, 4)
            .map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
        </div>
      </section>
    </>
  );
}
