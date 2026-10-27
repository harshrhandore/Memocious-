import { test } from "node:test";
import assert from "node:assert/strict";
import { customHandoff, type CustomReceipt } from "../src/lib/custom-request";
const r: CustomReceipt = {
  id: "private-request-id",
  code: "CUS-2610-000001-0123456789AB",
  name: "Gift",
  slug: "gift",
  quantity: 1,
  options: [],
  personalMessage: "Hello",
  occasion: "",
  pincode: "400001",
  budgetMinPaise: 0,
  budgetMaxPaise: 10000,
  estimateMinPaise: 0,
  estimateMaxPaise: null,
  requestedDate: "2026-11-01",
  fileCount: 2,
  status: "new",
  version: 1,
  quotePaise: null,
  quoteTerms: null,
  quoteValidUntil: null,
  files: [{ id: "private-file-id", status: "attached" }],
};
test("custom continuation includes real zero budget and private file count without private links", () => {
  const h = customHandoff(r, "919876543210", "https://example.com");
  assert.ok(h.url?.startsWith("https://wa.me/919876543210?text="));
  assert.match(h.message, /INR 0.00/);
  assert.match(h.message, /2 private reference image/);
  assert.doesNotMatch(
    h.message,
    /private-file-id|private-request-id|api\/|token=/,
  );
  assert.match(h.message, /not attached/);
});
test("long custom plan uses bounded WhatsApp continuation and retains full copy summary", () => {
  const h = customHandoff(
    { ...r, personalMessage: "x".repeat(2000) },
    "919876543210",
    "https://example.com",
  );
  assert.equal(h.shortened, true);
  assert.ok([...new URL(h.url!).searchParams.get("text")!].length <= 1500);
  assert.ok(h.message.length > 2000);
});
test("saved custom receipt survives missing or invalid managed destination", () => {
  for (const number of [null, "123"]) {
    const h = customHandoff(r, number, "https://example.com");
    assert.equal(h.url, null);
    assert.equal(h.code, r.code);
  }
});
