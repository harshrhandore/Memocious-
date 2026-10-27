import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const order = {
  code: "GFT-2610-000001-0123456789AB",
  source: "product",
  status: "in_production",
  version: 4,
  createdAt: "2026-10-26T12:00:00Z",
  updatedAt: "2026-10-27T12:00:00Z",
  estimatePaise: 0,
  confirmedTotalPaise: 30000,
  paymentReceivedPaise: 15000,
  paymentVerified: true,
  eta: null,
};
test("isolated owned timeline polls safely and clears data after authorization loss", async ({
  page,
}) => {
  await page.clock.install();
  let calls = 0;
  await page.route("**/api/orders*", (r) => {
    calls++;
    return calls === 1
      ? r.fulfill({
          json: {
            order,
            items: [
              {
                id: "item",
                name: "Historical gift",
                quantity: 1,
                unitPricePaise: 0,
                options: [{ label: "Cream" }],
                message: "<script>inert gift words</script>",
              },
            ],
            events: [
              {
                version: 4,
                status: "in_production",
                at: order.updatedAt,
                note: "Your gift is being made.",
              },
            ],
            hasOlderEvents: false,
            hasMoreItems: false,
          },
        })
      : r.fulfill({
          status: 404,
          contentType: "text/html",
          body: "Unauthorized",
        });
  });
  await page.goto("http://127.0.0.1:4174/phase2-order-timeline");
  await expect(page.getByRole("heading", { name: order.code })).toBeVisible();
  await expect(page.getByText(/This is a partial payment/)).toBeVisible();
  await expect(
    page.getByText("<script>inert gift words</script>"),
  ).toBeVisible();
  expect(
    await page
      .locator("script")
      .filter({ hasText: "inert gift words" })
      .count(),
  ).toBe(0);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.clock.fastForward(30000);
  await expect(page.getByRole("status")).toContainText(
    "unavailable for your account",
  );
  await expect(page.getByRole("heading", { name: order.code })).toHaveCount(0);
  const ended = calls;
  await page.clock.fastForward(300000);
  expect(calls).toBe(ended);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});
test("isolated orders distinguish an empty owned account from guest claiming", async ({
  page,
  request,
}) => {
  await page.route("**/api/orders*", (r) =>
    r.fulfill({ json: { orders: [], hasMore: false } }),
  );
  await page.goto("http://127.0.0.1:4174/phase2-owned-orders");
  await expect(
    page.getByText(/Signing in does not claim a guest enquiry/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next orders" }),
  ).toBeDisabled();
  const blocked = await request.get("http://localhost:3000/api/orders");
  expect(blocked.status()).toBe(503);
  expect(blocked.headers()["cache-control"]).toContain("no-store");
});
