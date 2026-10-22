import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const category = {
  kind: "category",
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  version: 1,
  label: "Hampers",
  slug: "hampers",
  parentId: null,
  sortOrder: 0,
  active: true,
};
test("isolated Studio UI creates typed details, option groups and confirms an exact deletion count", async ({
  page,
}) => {
  let mutation: Record<string, unknown> | undefined;
  let deletes: Record<string, unknown>[] = [];
  const workspace = {
    products: [],
    total: 0,
    taxonomy: [category],
    settings: {
      brand: "Memocious",
      tagline: "Thoughtful gifts",
      contactEmail: "",
      whatsappNumber: null,
      requireLogin: false,
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/session")
      return route.fulfill({ json: { csrf: "fixture-csrf" } });
    if (path === "/api/admin/workspace")
      return route.fulfill({ json: workspace });
    if (path === "/api/admin/products") {
      mutation = route.request().postDataJSON();
      return route.fulfill({ json: { id: "fixture-id", version: 2 } });
    }
    if (path === "/api/admin/delete") {
      const body = route.request().postDataJSON();
      deletes.push(body);
      return route.fulfill({
        json: body.digest
          ? { deleted: 3 }
          : { count: 3, digest: "a".repeat(64) },
      });
    }
    return route.fulfill({
      status: 404,
      json: { message: "Unexpected fixture request" },
    });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a private product" });
  await dialog.getByLabel("Name", { exact: true }).fill("A thoughtful fixture");
  await dialog
    .getByLabel("URL slug", { exact: true })
    .fill("a-thoughtful-fixture");
  await dialog.getByLabel("From price in ₹").fill("0");
  await dialog.getByLabel("Hampers", { exact: true }).check();
  await dialog.getByRole("button", { name: "Add option group" }).click();
  await dialog.getByLabel("Label", { exact: true }).fill("Wrapping");
  await dialog.getByLabel("Choice 1", { exact: true }).fill("Rose");
  await dialog.getByLabel("Added price in ₹").fill("10.50");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Save product details" }).click();
  await expect(dialog).not.toBeVisible();
  const fields = mutation?.fields as Record<string, unknown>;
  expect(fields.pricePaise).toBe(0);
  expect(fields.categories).toEqual([category.id]);
  expect(fields.options).toEqual([
    {
      label: "Wrapping",
      kind: "addon",
      required: false,
      maxCount: 1,
      values: [{ label: "Rose", deltaPaise: 1050 }],
    },
  ]);
  expect(JSON.stringify(mutation)).not.toContain("_key");
  await page
    .getByRole("button", { name: "Soft-delete all…", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", { name: "Review deletion" });
  await expect(confirmation).toContainText("exactly 3 products");
  await confirmation.getByLabel("Type DELETE 3").fill("DELETE 2");
  await confirmation
    .getByRole("button", { name: "Confirm soft deletion" })
    .click();
  expect(deletes).toHaveLength(1);
  await confirmation.getByLabel("Type DELETE 3").fill("DELETE 3");
  await confirmation
    .getByRole("button", { name: "Confirm soft deletion" })
    .click();
  await expect(confirmation).not.toBeVisible();
  expect(deletes[1]).toMatchObject({
    ids: null,
    mode: "soft",
    confirmation: "DELETE 3",
    digest: "a".repeat(64),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
