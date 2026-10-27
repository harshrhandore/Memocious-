import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("guest builder explores four steps without pretending to save or submit", async ({
  page,
  request,
}) => {
  await page.goto("/build-a-gift");
  await expect(
    page.getByRole("heading", { name: "Plan a custom gift" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "INR 500 to below 1,000", exact: true })
    .click();
  await page.getByRole("button", { name: "Next step" }).click();
  const select = page.getByRole("combobox", { name: "Gift type" });
  const id = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(id!);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByLabel("Recipient nickname (optional)").fill("Friend");
  await page.getByRole("button", { name: "Next step" }).click();
  await page
    .getByRole("textbox", { name: "Personal message", exact: true })
    .fill("<script>plain text</script>");
  await expect(
    page
      .getByRole("paragraph")
      .filter({ hasText: "<script>plain text</script>" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save to my account" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const r = await request.get("/api/builder/drafts");
  expect(r.status()).toBe(503);
  expect(r.headers()["cache-control"]).toContain("no-store");
  const denied = await request.post("/api/builder/drafts", { data: {} });
  expect(denied.status()).toBe(403);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});
test("owned draft autosave conflict keeps local edits and loads latest for comparison", async ({
  page,
}) => {
  const type = "12345678-1234-4234-8234-123456789012";
  let saved: {
    id: string;
    version: number;
    step: number;
    schemaVersion: number;
    payload: Record<string, unknown>;
    expiresAt: string;
    updatedAt: string;
  } | null = null;
  let saves = 0;
  await page.route("**/api/builder/choices*", (r) =>
    r.fulfill({
      json: [
        {
          id: type,
          name: "Fixture base gift",
          version: 1,
          pricePaise: 0,
          maxPricePaise: null,
          moq: 1,
          leadDays: 0,
          messageLimit: 500,
          requiresPhotos: false,
          optionGroups: [],
        },
      ],
    }),
  );
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/builder/drafts*", async (r) => {
    if (r.request().method() === "GET") {
      if (r.request().url().includes("?id="))
        return r.fulfill({
          json: {
            ...saved,
            version: 2,
            payload: { ...saved!.payload, message: "Other device" },
          },
        });
      return r.fulfill({ json: [] });
    }
    const b = r.request().postDataJSON();
    saves++;
    if (b.action === "create") {
      saved = {
        id: b.id,
        version: 1,
        schemaVersion: 2,
        step: b.step,
        payload: b.payload,
        expiresAt: "2026-12-01T00:00:00Z",
        updatedAt: "2026-10-27T00:00:00Z",
      };
      return r.fulfill({ json: saved });
    }
    return r.fulfill({ status: 409, json: { message: "Draft changed." } });
  });
  await page.goto("http://127.0.0.1:4174/phase2-builder");
  await page
    .getByRole("button", { name: "Under INR 500", exact: true })
    .click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("combobox", { name: "Gift type" }).selectOption(type);
  await page.getByRole("combobox", { name: "Base gift" }).selectOption(type);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page
    .getByRole("textbox", { name: "Personal message", exact: true })
    .fill("Initial message");
  await page.getByRole("button", { name: "Save to my account" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved to your account.");
  await page
    .getByRole("textbox", { name: "Personal message", exact: true })
    .fill("My local message");
  await expect(page.getByRole("status")).toContainText(
    "changed in another tab",
    { timeout: 10000 },
  );
  await expect(
    page.getByRole("textbox", { name: "Personal message", exact: true }),
  ).toHaveValue("My local message");
  expect(saves).toBe(2);
  await page
    .getByRole("button", {
      name: "Load latest and keep my edits for comparison",
    })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Personal message", exact: true }),
  ).toHaveValue("Other device");
  await expect(page.locator("pre")).toContainText("My local message");
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});

test("configured builder validates required options and saves a provisional zero estimate", async ({
  page,
}) => {
  const id = "12345678-1234-4234-8234-123456789012";
  let sent: Record<string, unknown> | undefined;
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/builder/choices*", (r) =>
    r.fulfill({
      json: [
        {
          id,
          name: "Configured gift",
          version: 2,
          pricePaise: 0,
          maxPricePaise: null,
          moq: 2,
          leadDays: 3,
          messageLimit: 500,
          requiresPhotos: false,
          optionGroups: [
            {
              id,
              label: "Colour",
              kind: "colour",
              required: true,
              maxCount: 1,
              values: [{ id, label: "Cream", deltaPaise: 0 }],
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/builder/drafts*", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ json: [] });
    sent = r.request().postDataJSON();
    return r.fulfill({
      json: {
        id,
        version: 1,
        schemaVersion: 2,
        step: 8,
        payload: sent!.payload,
        expiresAt: "2027-01-01T00:00:00Z",
        updatedAt: "2026-10-27T00:00:00Z",
        estimate: {
          status: "provisional",
          minPaise: 0,
          maxPaise: null,
          pricingVersion: 2,
        },
      },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-builder");
  await page
    .getByRole("button", { name: "Under INR 500", exact: true })
    .click();
  await page.getByLabel("Custom minimum INR", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Save to my account" }).click();
  await expect(page.getByRole("status")).toContainText("Check the budget");
  expect(sent).toBeUndefined();
  await page
    .getByRole("button", { name: "Under INR 500", exact: true })
    .click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("combobox", { name: "Gift type" }).selectOption(id);
  await page.getByRole("combobox", { name: "Base gift" }).selectOption(id);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Cream/ }).check();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByText(
      /Sign in and save the current draft before adding private images/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("2");
  await page.getByLabel("Requested date", { exact: true }).fill("2027-01-01");
  await page.getByLabel("Contact name", { exact: true }).fill("Test");
  await page
    .getByLabel("Phone with country code", { exact: true })
    .fill("+447700900123");
  await page.getByLabel("City", { exact: true }).fill("Test");
  await page.getByLabel("Pincode", { exact: true }).fill("400001");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("button", { name: "Submit quote request" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save to my account" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved to your account.");
  await expect(
    page.getByRole("button", { name: "Submit quote request" }),
  ).toBeEnabled();
  expect(sent?.schemaVersion).toBe(2);
  expect(sent?.payload).toMatchObject({ contact: { phone: "447700900123" } });
  await expect(
    page.getByText(/Starting estimate.*no upper estimate supplied/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});
