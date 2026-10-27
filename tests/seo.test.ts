import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtureProducts } from "../src/lib/fixtures";
import { jsonLd } from "../src/lib/domain";
import {
  catalogueCanonical,
  productMetadata,
  productStructuredData,
  publicPageMetadata,
  publishedImage,
  publicUrl,
  siteOrigin,
} from "../src/lib/seo";
const origin = "https://example.com",
  p = {
    ...fixtureProducts[0],
    demo: false,
    pricePaise: 0,
    maxPricePaise: null,
    avgRating: 4.25,
    reviewCount: 2,
    image: "/media/published-photo",
    images: [
      { url: "/api/builder/files/private-file", alt: "Private" },
      { url: "https://other.example/image", alt: "External" },
    ],
  },
  ready = { preview: false, gated: false, ratingsReady: true };
test("canonical URLs keep normal pagination and discard search, filter, tracking and secret query text", () => {
  assert.equal(catalogueCanonical("/shop", { page: "2" }), "/shop?page=2");
  assert.equal(
    catalogueCanonical("/shop", { q: "PRIVATE CONTACT", page: "2" }),
    "/shop",
  );
  assert.equal(
    catalogueCanonical("/shop/category/hampers", {
      sort: "price-asc",
      token: "PRIVATE TOKEN",
    }),
    "/shop/category/hampers",
  );
  assert.equal(
    catalogueCanonical("/shop", { page: "3", limit: "12" }),
    "/shop",
  );
  assert.equal(catalogueCanonical("/shop", { page: "NaN" }), "/shop");
  assert.equal(
    catalogueCanonical("/shop", { page: "2", utm_source: "PRIVATE" }),
    "/shop?page=2",
  );
});
test("public metadata refuses credential origins, private canonical paths and private/external image URLs", () => {
  for (const value of [
    "https://user:password@example.com",
    "https://example.com/?token=private",
    "file:///secret",
  ])
    assert.throws(() => siteOrigin(value));
  assert.throws(() => publicUrl("//other.example", origin));
  assert.equal(publishedImage("/api/builder/files/private", origin), null);
  assert.equal(publishedImage("/media/published?token=private", origin), null);
  assert.equal(publishedImage("/media/../private", origin), null);
  for (const path of [
    "/account",
    "/orders/private",
    "/auth/callback?code=private",
  ])
    assert.throws(() =>
      publicPageMetadata({
        title: "Title",
        description: "Summary",
        path,
        origin,
      }),
    );
  assert.throws(() =>
    publicPageMetadata({
      title: "Title",
      description: "Summary",
      path: "/shop",
      origin,
      image: "https://example.com/api/private",
    }),
  );
});
test("product metadata selects approved public images and hides gated catalogue details", () => {
  const meta = productMetadata(p, origin, { preview: false, gated: false });
  assert.equal(meta.alternates?.canonical, `${origin}/product/${p.slug}`);
  assert.equal(JSON.stringify(meta).includes("/media/published-photo"), true);
  const gated = JSON.stringify(
    productMetadata(p, origin, { preview: false, gated: true }),
  );
  assert.equal(gated.includes(p.name), false);
  assert.equal(gated.includes("published-photo"), false);
});
test("Product JSON-LD has no invented Offer, preserves a provisional zero and projects no private fields", () => {
  const data = productStructuredData(
    { ...p, description: "</script><script>unsafe</script>" },
    origin,
    ready,
  );
  const encoded = jsonLd(data);
  assert.equal(encoded.includes("</script>"), false);
  assert.doesNotMatch(
    encoded,
    /private-file|other.example|userId|refreshToken/,
  );
  const product = data.find((x) => x["@type"] === "Product")!;
  assert.ok(product && "aggregateRating" in product);
  assert.equal("offers" in product, false);
  assert.match(JSON.stringify(product.additionalProperty), /INR 0.00/);
  assert.deepEqual(product.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.3,
    reviewCount: 2,
    bestRating: 5,
    worstRating: 0,
  });
  assert.equal(
    JSON.parse(encoded)[1].description,
    "</script><script>unsafe</script>",
  );
});
test("preview/gated products emit no schema, and zero/unrated/unapproved aggregates remain omitted", () => {
  assert.deepEqual(
    productStructuredData(p, origin, { ...ready, preview: true }),
    [],
  );
  assert.deepEqual(
    productStructuredData(p, origin, { ...ready, gated: true }),
    [],
  );
  assert.deepEqual(
    productStructuredData({ ...p, demo: true }, origin, ready),
    [],
  );
  for (const avgRating of [null, 0, 0.04, NaN, 6])
    assert.equal(
      productStructuredData({ ...p, avgRating }, origin, ready).some(
        (x) => x["@type"] === "Product",
      ),
      false,
    );
  assert.equal(
    productStructuredData(p, origin, { ...ready, ratingsReady: false }).some(
      (x) => x["@type"] === "Product",
    ),
    false,
  );
  const quote = productStructuredData(
    { ...p, pricePaise: null },
    origin,
    ready,
  )[1];
  assert.equal("additionalProperty" in quote, false);
});
