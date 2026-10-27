import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
test.skip(
  process.env.PLAYWRIGHT_PHASE6 !== "true",
  "Isolated metadata preview run explicitly enables Phase 6; no live providers.",
);
test("public metadata canonicalizes pagination and excludes search/tracking text", async ({
  page,
}) => {
  await page.goto("/shop?page=2&utm_source=PRIVATE_CAMPAIGN");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/shop?page=2",
  );
  const response = await page.goto(
    "/shop?q=PRIVATE_CONTACT&page=2&utm_source=PRIVATE_CAMPAIGN",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/shop",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "http://localhost:3000/shop",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  expect(await page.locator("head").innerHTML()).not.toContain(
    "PRIVATE_CONTACT",
  );
  expect(await page.locator("head").innerHTML()).not.toContain(
    "PRIVATE_CAMPAIGN",
  );
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["set-cookie"]).toBeUndefined();
  await page.goto(
    "/shop/category/flower-bouquets?sort=price-asc&token=PRIVATE_TOKEN",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/shop/category/flower-bouquets",
  );
  expect(await page.locator("head").innerHTML()).not.toContain("PRIVATE_TOKEN");
});
test("preview product shares clean metadata without illustrative Product or Offer claims", async ({
  page,
}) => {
  await page.goto("/product/a-little-box-of-joy?message=PRIVATE_WORDS");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/product/a-little-box-of-joy",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://localhost:3000/share-card/v1",
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0,
  );
  expect(await page.locator("head").innerHTML()).not.toContain("PRIVATE_WORDS");
  await page.goto("/product/not-a-real-gift?token=PRIVATE_TOKEN");
  await expect(
    page.getByRole("heading", {
      name: "This little something isn\u2019t here.",
    }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
test("private pages and staging crawler boundaries remain noindex", async ({
  page,
  request,
}) => {
  await page.goto("/login?token=PRIVATE_TOKEN&next=/account");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  expect(await page.locator("head").innerHTML()).not.toContain("PRIVATE_TOKEN");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("<loc>");
  const about = await page.goto("/about");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/about",
  );
  expect(about?.headers()["x-robots-tag"]).toContain("noindex");
});
test("versioned brand share card ignores query input and emits a fixed no-cookie PNG", async ({
  request,
}) => {
  const first = await request.get("/share-card/v1"),
    other = await request.get(
      "/share-card/v1?name=PRIVATE_NAME&token=PRIVATE_TOKEN",
    );
  expect(first.status()).toBe(200);
  expect(first.headers()["content-type"]).toContain("image/png");
  expect(first.headers()["set-cookie"]).toBeUndefined();
  const bytes = await first.body();
  expect((await other.body()).equals(bytes)).toBe(true);
  const info = await sharp(bytes).metadata();
  expect(info.width).toBe(1200);
  expect(info.height).toBe(630);
  await writeFile(".local/phase6-share-card.png", bytes);
});
