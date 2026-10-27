import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "12345678-1234-4234-8234-123456789012";
const receipt = {
  id,
  code: "CUS-2610-000001-0123456789AB",
  name: "Fixture gift",
  slug: "fixture",
  quantity: 1,
  options: [],
  personalMessage: "Private words",
  occasion: "",
  pincode: "400001",
  budgetMinPaise: 0,
  budgetMaxPaise: 10000,
  estimateMinPaise: 0,
  estimateMaxPaise: null,
  requestedDate: "2026-11-10",
  fileCount: 1,
  status: "new",
  version: 1,
  quotePaise: null,
  quoteTerms: null,
  quoteValidUntil: null,
  message: "Complete saved plan",
  url: null,
  number: null,
  shortened: false,
};
test("custom request retry keeps its key and shows only acknowledged receipt", async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/challenges.cloudflare.com/**", (r) => r.abort());
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/builder/submit", (r) => {
    bodies.push(r.request().postDataJSON());
    return bodies.length === 1 ? r.abort() : r.fulfill({ json: receipt });
  });
  await page.goto("http://127.0.0.1:4174/phase2-custom-submit");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.getByRole("status")).toContainText("may already be saved");
  await expect(
    page.getByRole("heading", { name: `Custom request ${receipt.code}` }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(
    page.getByRole("heading", { name: `Custom request ${receipt.code}` }),
  ).toBeVisible();
  expect(bodies[0].requestKey).toBe(bodies[1].requestKey);
  expect(bodies[0]).toMatchObject({
    draft: id,
    version: 2,
    consent: true,
    acceptEstimate: true,
  });
  await expect(
    page.getByText("WhatsApp handoff is temporarily unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("not attached to WhatsApp.", { exact: false }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});
test("owner quote update records terms and explicit agreement before conversion", async ({
  page,
}) => {
  let version = 1,
    state = "contacted",
    linked: string | null = null;
  const mutations: Record<string, unknown>[] = [];
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/admin/custom*", (r) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      mutations.push(b);
      version++;
      if (b.action === "update") state = b.fields.status;
      else linked = id;
    }
    return r.fulfill({
      json: {
        newCount: 0,
        hasMore: false,
        records: [
          {
            id,
            code: receipt.code,
            version,
            status: state,
            quantity: 1,
            message: "Private words",
            contact: {
              name: "Customer",
              phone: "447700900123",
              email: "",
              city: "Test",
            },
            quote_paise: 0,
            quote_terms: "Free gift",
            quote_valid_until: "2099-01-01",
            linked_order_id: linked,
            immutable_snapshot: {},
            files: [],
            history: [],
          },
        ],
      },
    });
  });
  await page.goto("http://127.0.0.1:4174/phase2-custom-owner");
  await page
    .getByText(`${receipt.code}: contacted - Customer`, { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("won");
  await page
    .getByLabel("Internal reason / note")
    .fill("Customer agreed by phone");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save request update" }).click();
  await page
    .getByText(`${receipt.code}: won - Customer`, { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Convert agreed quote to one order" })
    .click();
  await page
    .getByText(`${receipt.code}: won - Customer`, { exact: true })
    .click();
  await expect(
    page.getByText(`Linked order ${receipt.code}`, { exact: false }),
  ).toBeVisible();
  expect(mutations[0]).toMatchObject({
    action: "update",
    version: 1,
    fields: {
      quotePaise: 0,
      agreement: true,
      reason: "Customer agreed by phone",
    },
  });
  expect(mutations[1]).toMatchObject({ action: "convert", version: 2 });
});

test("review challenge mounts again after returning and refreshes after failed submission", async ({
  page,
}) => {
  await page.route("**/challenges.cloudflare.com/**", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: `window.__challenge={rendered:0,removed:0,reset:0};window.turnstile={ready:fn=>fn(),render:(node)=>{window.__challenge.rendered++;const input=document.createElement('input');input.type='hidden';input.name='cf-turnstile-response';input.value='fixture-token';node.append(input);return 'fixture-widget';},reset:()=>{window.__challenge.reset++},remove:()=>{window.__challenge.removed++}};`,
    }),
  );
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/builder/submit", (r) =>
    r.fulfill({ status: 403, json: { message: "Verification failed" } }),
  );
  await page.goto("http://127.0.0.1:4174/phase2-custom-submit");
  const counts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __challenge: { rendered: number; removed: number; reset: number };
          }
        ).__challenge,
    );
  await expect.poll(counts).toMatchObject({ rendered: 1 });
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect.poll(counts).toMatchObject({ reset: 1 });
  await page.getByRole("button", { name: "Toggle review fixture" }).click();
  await expect.poll(counts).toMatchObject({ removed: 1 });
  await page.getByRole("button", { name: "Toggle review fixture" }).click();
  await expect.poll(counts).toMatchObject({ rendered: 2 });
});
