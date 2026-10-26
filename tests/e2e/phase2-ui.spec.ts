import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fixture = "http://127.0.0.1:4174";
const id = "12345678-1234-4234-8234-123456789012";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
});
test("review requires deliberate zero and submits pending, never approval", async ({
  page,
}) => {
  let saved: Record<string, unknown> | undefined;
  await page.route(/\/api\/reviews(?:\?.*)?$/, async (r) => {
    if (r.request().method() === "POST") {
      saved = r.request().postDataJSON();
      await r.fulfill({ json: { id, version: 1, status: "pending" } });
    } else
      await r.fulfill({
        json: saved
          ? [
              {
                id,
                product: id,
                rating: 0,
                body: saved.body,
                firstName: "Test",
                status: "pending",
                version: 1,
                deleted: false,
              },
            ]
          : [],
      });
  });
  await page.goto(`${fixture}/phase2-review`);
  const submit = page.getByRole("button", { name: "Submit for approval" });
  await expect(submit).toBeDisabled();
  await page.getByLabel("First name only").fill("Test");
  await page.getByRole("radio", { name: "0 stars", exact: true }).check();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("<script>inert</script>");
  await submit.click();
  await expect(page.getByText(/Review saved for moderation/)).toBeVisible();
  expect(saved?.stars).toBe(0);
  expect(saved).not.toHaveProperty("status");
  await expect(page.getByText(/Your review: pending/)).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});
test("enterprise saves one request and offers explicit WhatsApp continuation", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/inquiries", async (r) => {
    submitted = r.request().postDataJSON();
    await r.fulfill({
      json: {
        id,
        code: "ENT-fixture",
        message: "Fixture summary",
        number: "447700900123",
        url: "https://wa.me/447700900123?text=fixture",
        notification:
          "Available in the owner dashboard. Email is not configured.",
      },
    });
  });
  await page.goto(`${fixture}/phase2-enterprise`);
  for (const [label, value] of [
    ["Organization", "Fixture"],
    ["Your role", "Test"],
    ["Contact name", "Test"],
    ["Email", "fixture@example.invalid"],
    ["Phone with country code", "+447700900123"],
    ["Delivery city", "Test"],
    ["Pincode", "400001"],
    ["Budget from (INR)", "100"],
    ["Budget to (INR)", "1000"],
    ["Notes", "Synthetic request"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(/Fixture gift - minimum/).fill("10");
  await page.getByLabel("Requested date").fill("2027-01-01");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save request" }).click();
  await expect(page.getByText("Enquiry ENT-fixture saved")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue on WhatsApp" }),
  ).toHaveAttribute("href", /wa.me/);
  expect(submitted?.kind).toBe("enterprise");
  const fields = submitted?.fields as {
    items: { quantity: number }[];
    budgetMinPaise: number;
  };
  expect(fields.items[0].quantity).toBe(10);
  expect(fields.budgetMinPaise).toBe(10000);
  await expect(page.getByText(/site has not sent a WhatsApp/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test("account addresses stay private and deletion is a request", async ({
  page,
}) => {
  await page.route(/\/api\/reviews(?:\?.*)?$/, (r) => r.fulfill({ json: [] }));
  await page.route("**/api/inquiries", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/addresses", (r) => r.fulfill({ json: [] }));
  let action = "";
  await page.route("**/api/privacy", (r) => {
    action = r.request().postDataJSON().action;
    return r.fulfill({
      json: { message: "Deletion requested; account has not been deleted." },
    });
  });
  await page.goto(`${fixture}/phase2-account`);
  await page.getByRole("checkbox", { name: /I request deletion/ }).check();
  await page.getByRole("button", { name: "Request account deletion" }).click();
  await expect(
    page.getByText("Deletion requested; account has not been deleted."),
  ).toBeVisible();
  expect(action).toBe("delete-request");
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
});
test("carousel respects reduced motion and manual controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${fixture}/phase2-carousel`);
  await expect(
    page.getByRole("button", { name: "Play rotation" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next gift" }).click();
  await expect(page.getByRole("link", { name: "Another gift" })).toBeVisible();
  await page.getByRole("button", { name: "Previous gift" }).click();
  await expect(page.getByRole("link", { name: "Fixture gift" })).toBeVisible();
});
test("owner queue renders genuine empty states and publishes nothing automatically", async ({
  page,
}) => {
  await page.route("**/api/admin/reviews*", (r) =>
    r.fulfill({ json: { reviews: [], reports: [] } }),
  );
  await page.route("**/api/admin/inquiries*", (r) =>
    r.fulfill({
      json: {
        enterprise: [],
        contacts: [],
        privacy: [],
        newCount: 0,
        events: [],
      },
    }),
  );
  await page.route("**/api/admin/proof*", (r) =>
    r.fulfill({ json: { proof: [], counters: [], documents: [] } }),
  );
  await page.goto(`${fixture}/phase2-owner`);
  await expect(page.getByText(/New enterprise enquiries: 0/)).toBeVisible();
  await page
    .getByText("Genuine sales proof and counters", { exact: true })
    .click();
  await expect(page.getByLabel("Evidence reference (private)")).toBeVisible();
  await expect(page.getByLabel("Actual count")).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("owner quote form sends version, terms, validity and deliberate agreement", async ({
  page,
}) => {
  let mutation: Record<string, unknown> | undefined;
  await page.route("**/api/admin/reviews*", (r) =>
    r.fulfill({ json: { reviews: [], reports: [] } }),
  );
  await page.route("**/api/admin/proof*", (r) =>
    r.fulfill({ json: { proof: [], counters: [], documents: [] } }),
  );
  const inquiry = {
    id,
    code: "ENT-fixture",
    organization: "Test org",
    contact_name: "Test",
    phone: "447700900123",
    email: "fixture@example.invalid",
    notes: "Synthetic",
    items: [],
    branding: {},
    pipeline: "contacted",
    version: 2,
    quote_paise: null,
    linked_order_id: null,
    assets: [],
  };
  await page.route("**/api/admin/inquiries*", (r) => {
    if (r.request().method() === "POST") mutation = r.request().postDataJSON();
    return r.fulfill({
      json: {
        enterprise: [inquiry],
        contacts: [],
        privacy: [],
        newCount: 0,
        events: [],
      },
    });
  });
  await page.goto(`${fixture}/phase2-owner`);
  await page
    .getByText("Enterprise enquiries and quote history", { exact: true })
    .click();
  await page.getByRole("combobox", { name: "Pipeline", exact: true }).selectOption("quote_sent");
  await page.getByLabel(/Quote total INR/).fill("0");
  await page.getByLabel("Quotation terms / revision").fill("Synthetic terms");
  await page.getByLabel("Quotation valid until").fill("2027-01-01");
  await page
    .getByLabel("Internal note / transition reason")
    .fill("Synthetic reason");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(mutation?.expectedVersion).toBe(2);
  expect(mutation?.fields).toMatchObject({
    pipeline: "quote_sent",
    quotePaise: 0,
    terms: "Synthetic terms",
    validUntil: "2027-01-01",
    agreement: false,
  });
});
