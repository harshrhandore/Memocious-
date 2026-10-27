import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const code = "GFT-2610-000001-0123456789AB";
const initial = {
  id: "12345678-1234-4234-8234-123456789012",
  code,
  version: 2,
  source: "product",
  status: "confirmed",
  createdAt: "2026-10-27T10:00:00Z",
  updatedAt: "2026-10-27T11:00:00Z",
  estimatePaise: 10000,
  confirmedTotalPaise: 10000,
  paymentReceivedPaise: 0,
  paymentVerified: false,
  refundRecordedPaise: 0,
  contactName: "Fixture customer",
  phone: "12025550123",
  holdFrom: null,
  refundDue: false,
  eta: null,
};
test("owner receipt retry preserves the request and changes no status without acknowledgement", async ({
  page,
}, info) => {
  let order = { ...initial };
  const attempts: unknown[] = [];
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "isolated-fixture" } }),
  );
  await page.route("**/api/admin/orders**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      attempts.push(body);
      if (attempts.length === 1)
        return route.fulfill({
          status: 503,
          json: { message: "Uncertain fixture" },
        });
      order = {
        ...order,
        version: 3,
        paymentReceivedPaise: 2000,
        paymentVerified: true,
      };
      return route.fulfill({ json: { code, version: 3, status: "confirmed" } });
    }
    return route.fulfill({
      json: new URL(route.request().url()).searchParams.has("code")
        ? {
            order,
            items: [
              {
                id: "saved-item",
                name: "Saved gift",
                quantity: 1,
                message: "<script>window.bad=true</script>",
              },
            ],
            hasMoreItems: false,
            events: [
              {
                version: order.version,
                status: "confirmed",
                at: initial.updatedAt,
                note: "Deposit acknowledged",
                internalNote: "PRIVATE bank evidence",
              },
            ],
            hasOlderEvents: false,
            moneyRecords:
              order.version === 3
                ? [
                    {
                      id: "money-record",
                      kind: "receipt",
                      amountPaise: 2000,
                      date: "2026-10-27",
                      reference: "PRIVATE bank reference",
                      reason: "Verified actual deposit",
                    },
                  ]
                : [],
            hasOlderMoneyRecords: false,
          }
        : { orders: [order], hasMore: false },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-owner-orders");
  await page.getByRole("button", { name: `Manage ${code}` }).click();
  await page.getByLabel("Action", { exact: true }).selectOption("receipt");
  await page.getByLabel("Actual amount in paise").fill("2000");
  await page.getByLabel("Receipt/refund date (India)").fill("2026-10-27");
  await page
    .getByLabel("Private receipt/refund reference")
    .fill("PRIVATE bank reference");
  await page
    .getByLabel("Internal reason / verification evidence")
    .fill("Verified actual deposit");
  await page.getByRole("button", { name: "Record verified action" }).click();
  await expect(page.getByText(/The outcome is uncertain/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh saved records" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Actual amount in paise")).toBeDisabled();
  expect(attempts).toHaveLength(1);
  await page.getByRole("button", { name: "Retry same action" }).click();
  await expect(page.getByText("Confirmed · revision 3")).toBeVisible();
  expect(attempts[0]).toEqual(attempts[1]);
  expect(attempts[1]).toMatchObject({
    action: "receipt",
    version: 2,
    fields: { amountPaise: 2000, reference: "PRIVATE bank reference" },
  });
  await expect(
    page.getByText("This is a partial payment, not payment in full."),
  ).toBeVisible();
  const link = await page
    .getByRole("link", { name: "Notify on WhatsApp" })
    .getAttribute("href");
  expect(link).not.toContain("PRIVATE");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { bad?: boolean }).bad),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `.local/phase4-owner-${info.project.name}.png`,
    fullPage: true,
  });
});
test("paid cancellation remains refund due and MFA denial clears private records", async ({
  page,
  request,
}) => {
  const denied = await request.get("/api/admin/orders");
  expect(denied.status()).toBe(503);
  expect(denied.headers()["cache-control"]).toContain("no-store");
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture" } }),
  );
  await page.route("**/api/admin/orders**", (r) => {
    if (r.request().method() === "POST")
      return r.fulfill({
        status: 403,
        json: { message: "Verify your authenticator again." },
      });
    return r.fulfill({
      json: {
        order: {
          ...initial,
          status: "cancelled",
          paymentReceivedPaise: 2000,
          paymentVerified: true,
          refundDue: true,
        },
        items: [],
        hasMoreItems: false,
        events: [],
        hasOlderEvents: false,
        moneyRecords: [],
        hasOlderMoneyRecords: false,
      },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-owner-orders");
  await expect(
    page.getByText("Refund remains due. Cancellation did not return money."),
  ).toBeVisible();
  await page.getByLabel("Action", { exact: true }).selectOption("refund");
  await page.getByLabel("Actual amount in paise").fill("500");
  await page.getByLabel("Receipt/refund date (India)").fill("2026-10-27");
  await page
    .getByLabel("Private receipt/refund reference")
    .fill("offline proof");
  await page
    .getByLabel("Internal reason / verification evidence")
    .fill("Verified return");
  await page.getByRole("button", { name: "Record verified action" }).click();
  await expect(
    page.getByRole("link", { name: "Notify on WhatsApp" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("form", { name: "Record order action" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Refund remains due. Cancellation did not return money."),
  ).toHaveCount(0);
});
