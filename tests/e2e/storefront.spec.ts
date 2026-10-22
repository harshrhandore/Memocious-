import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("home keeps honest content and enterprise-first order", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Some gifts are opened. Others are felt.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Collection preview · Illustrative sample designs & prices · Ordering is not open yet",
    ),
  ).toBeVisible();
  const first = page.locator(".path-card").first();
  await expect(first).toHaveAttribute("href", "/enterprise");
  expect(response?.headers()["set-cookie"]).toBeUndefined();
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response?.headers()["content-security-policy"]).not.toContain(
    "'unsafe-eval'",
  );
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a.violations).toEqual([]);
});
test("browse filters, sort and shareable routes use server results", async ({
  page,
}) => {
  await page.goto("/shop?category=bouquets&sort=price-asc");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(
    page.locator(".product-card").first().getByRole("heading"),
  ).toHaveText("Petals with a twist");
  await page.getByLabel("Sort gifts").selectOption("price-desc");
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect(
    page.locator(".product-card").first().getByRole("heading"),
  ).toHaveText("Forever in bloom");
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.goto("/shop?rating=4");
  await expect(
    page.getByRole("heading", {
      name: "Your perfect gift is still out there.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse all gifts" }).click();
  await expect(page.locator(".product-card")).toHaveCount(10);
  await page.goto("/shop?min=1000&max=5");
  await expect(
    page.getByRole("heading", { name: "Let’s try those filters again." }),
  ).toBeVisible();
});
test("product note stays escaped and unavailable ordering cannot submit", async ({
  page,
}) => {
  await page.goto("/product/a-little-box-of-joy");
  await page
    .getByLabel("Your words, their smile")
    .fill("<script>window.bad=true</script> 🎁");
  await expect(
    page
      .locator(".enquiry-form .notice p")
      .filter({ hasText: "<script>window.bad=true</script> 🎁" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "WhatsApp ordering opens soon" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  await page.getByRole("button", { name: "Enlarge gift image" }).click();
  await expect(
    page.getByRole("dialog", { name: "Enlarged gift image" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByText("150%")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("protected APIs reject missing CSRF and missing providers; private routes are no-store", async ({
  page,
  request,
}) => {
  const denied = await request.post("/api/enquiries", { data: {} });
  expect(denied.status()).toBe(403);
  const session = await request.get("/api/session");
  const csrf = (await session.json()).csrf;
  const blocked = await request.post("/api/enquiries", {
    headers: { Origin: "http://localhost:3000", "X-CSRF-Token": csrf },
    data: {},
  });
  expect(blocked.status()).toBe(503);
  expect(blocked.headers()["cache-control"]).toContain("no-store");
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toBeDisabled();
  const r = await page.goto("/account");
  expect(r?.headers()["cache-control"]).toContain("no-store");
  await page.goto("/not-a-real-admin");
  await expect(
    page.getByRole("heading", { name: "This little something isn’t here." }),
  ).toBeVisible();
});
test("mobile navigation traps focus and restores it on close", async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes("mobile"));
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open navigation" });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});
