import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "12345678-1234-4234-8234-123456789012",
  trace = "12345678-1234-4234-8234-123456789013",
  asOf = "2026-10-27T12:00:00.000Z";
const entry = {
  id,
  at: "2026-10-27T11:00:00.000Z",
  actorKind: "admin",
  action: "product.edit",
  entity: "product",
  entityId: id,
  requestId: trace,
  metadata: { version: 0, count: 0, configured: false },
  withheld: true,
};
async function fixtures(page: import("@playwright/test").Page) {
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/admin/workspace*", (r) =>
    r.fulfill({
      json: {
        products: [],
        total: 0,
        taxonomy: [],
        settings: {
          brand: "Memocious",
          tagline: "Thoughtful gifts",
          contactEmail: "",
          whatsappNumber: null,
          requireLogin: false,
        },
      },
    }),
  );
}
test("Studio lazily opens sections and preserves unsaved settings across navigation", async ({
  page,
}) => {
  await fixtures(page);
  let auditCalls = 0;
  await page.route("**/api/admin/audit*", (r) => {
    auditCalls++;
    return r.fulfill({
      json: {
        asOf,
        from: "2026-09-28",
        to: "2026-10-27",
        records: [],
        hasMore: false,
        nextCursor: null,
      },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-studio-shell");
  const nav = page.getByRole("navigation", {
    name: "Studio workspace navigation",
  });
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  expect(auditCalls).toBe(0);
  await nav.getByRole("button", { name: "Catalogue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Catalogue", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Brand name", { exact: true })
    .fill("Unsaved studio edit");
  await nav.getByRole("button", { name: "Owner audit", exact: true }).click();
  await expect(
    page.getByText("No audit records match these filters."),
  ).toBeVisible();
  expect(auditCalls).toBe(1);
  await nav.getByRole("button", { name: "Security", exact: true }).click();
  await expect(
    page.getByText("Authenticator verification fixture"),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Catalogue", exact: true }).click();
  await expect(page.getByLabel("Brand name", { exact: true })).toHaveValue(
    "Unsaved studio edit",
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
  await page.screenshot({
    path: `.local/phase5-studio-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("owner audit uses a frozen cursor, shows safe zero metadata and clears after MFA denial", async ({
  page,
  request,
}) => {
  await fixtures(page);
  const calls: URL[] = [];
  let denied = false;
  await page.route("**/api/admin/audit*", (r) => {
    const url = new URL(r.request().url());
    calls.push(url);
    if (denied)
      return r.fulfill({
        status: 403,
        json: { message: "Verify the owner authenticator again." },
      });
    if (url.searchParams.has("cursorAt"))
      return r.fulfill({
        json: {
          asOf,
          records: [{ ...entry, id: trace, action: "product.hide" }],
          hasMore: false,
          nextCursor: null,
        },
      });
    return r.fulfill({
      json: {
        asOf,
        records: [entry],
        hasMore: true,
        nextCursor: { at: entry.at, id },
      },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-studio-shell");
  await page
    .getByRole("navigation", { name: "Studio workspace navigation" })
    .getByRole("button", { name: "Owner audit", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "product.edit", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Recorded version: 0")).toBeVisible();
  await expect(page.getByText("Affected records: 0")).toBeVisible();
  await expect(page.getByText("Configured: No")).toBeVisible();
  await page.getByRole("button", { name: "Next audit page" }).click();
  await expect(
    page.getByRole("heading", { name: "product.hide", exact: true }),
  ).toBeVisible();
  expect(calls[1].searchParams.get("asOf")).toBe(asOf);
  expect(calls[1].searchParams.get("cursorId")).toBe(id);
  await page.getByRole("button", { name: "Previous audit page" }).click();
  await expect(
    page.getByRole("heading", { name: "product.edit", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Action prefix", { exact: true }).fill("product.");
  await page
    .getByRole("button", { name: "Search audit records", exact: true })
    .click();
  await expect.poll(() => calls.length).toBe(4);
  expect(calls[3].searchParams.get("action")).toBe("product.");
  expect(calls[3].searchParams.has("asOf")).toBe(false);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `.local/phase5-audit-${test.info().project.name}.png`,
    fullPage: true,
  });
  denied = true;
  await page
    .getByRole("button", { name: "Refresh latest audit records" })
    .click();
  await expect(
    page.getByText("Verify the owner authenticator again."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "product.edit", exact: true }),
  ).toHaveCount(0);
  const disabled = await request.get("http://localhost:3000/api/admin/audit");
  expect(disabled.status()).toBe(503);
  expect(disabled.headers()["cache-control"]).toContain("no-store");
});
