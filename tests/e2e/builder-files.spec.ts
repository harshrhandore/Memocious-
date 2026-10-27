import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "12345678-1234-4234-8234-123456789012",
  fileId = "12345678-1234-4234-8234-123456789013";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("private reference upload and removal wait for acknowledged server state", async ({
  page,
}) => {
  let ready = false,
    version = 1;
  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/api/session", (r) =>
    r.fulfill({ json: { csrf: "fixture", signedIn: true } }),
  );
  await page.route("**/api/builder/drafts*", (r) =>
    r.fulfill({
      json: {
        id,
        version,
        schemaVersion: 2,
        step: 6,
        payload: {},
        files: ready
          ? [
              {
                id: fileId,
                status: "ready_private",
                bytes: png.length,
                width: 1,
                height: 1,
              },
            ]
          : [],
        expiresAt: "2027-01-01",
        updatedAt: "2026-10-27",
      },
    }),
  );
  await page.route("**/api/builder/files", (r) => {
    requestBody = r.request().postDataJSON();
    return r.fulfill({ json: { id: fileId } });
  });
  await page.route(`**/api/builder/files/${fileId}`, (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({ contentType: "image/png", body: png });
    if (r.request().method() === "DELETE") {
      ready = false;
      version++;
      return r.fulfill({ json: { version } });
    }
    ready = true;
    version++;
    return r.fulfill({ json: { ready: true, file: { id: fileId, version } } });
  });
  await page.goto("http://127.0.0.1:4174/phase2-builder-files");
  await page
    .getByLabel("Choose or drop a reference image")
    .setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: png,
    });
  await expect(
    page.getByRole("img", { name: "Selected private reference preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Upload private reference" }).click();
  await expect(page.getByRole("status")).toContainText("saved privately");
  await expect(
    page.getByRole("img", { name: "Saved private gift reference" }),
  ).toBeVisible();
  expect(requestBody).toMatchObject({
    draft: id,
    version: 1,
    mime: "image/png",
    bytes: png.length,
  });
  await page.getByRole("button", { name: "Remove reference" }).click();
  await expect(page.getByRole("status")).toContainText("access removed");
  await expect(
    page.getByRole("img", { name: "Saved private gift reference" }),
  ).toHaveCount(0);
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
test("unsupported private reference never reserves a ticket", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/builder/files", (r) => {
    calls++;
    return r.abort();
  });
  await page.goto("http://127.0.0.1:4174/phase2-builder-files");
  await page
    .getByLabel("Choose or drop a reference image")
    .setInputFiles({
      name: "active.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg></svg>"),
    });
  await expect(page.getByRole("status")).toContainText("Convert HEIC");
  await expect(
    page.getByRole("button", { name: "Upload private reference" }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
});
