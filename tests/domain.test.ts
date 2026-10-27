import test from "node:test";
import assert from "node:assert/strict";
import {
  enquirySchema,
  parseFilters,
  ratingSchema,
  averageRating,
  safeReturnPath,
  csvCell,
  jsonLd,
} from "../src/lib/domain";
import {
  permitsAdmin,
  canEnrollInitialFactor,
  type SessionPolicy,
} from "../src/lib/session-policy";
import {
  buildWhatsApp,
  whatsappNumber,
  type Receipt,
} from "../src/lib/whatsapp";
test("review no-selection stays distinct from intentional zero", () => {
  assert.equal(ratingSchema.safeParse(null).success, false);
  assert.equal(ratingSchema.parse(0), 0);
  assert.equal(averageRating([]), null);
  assert.equal(averageRating([0, 0]), 0);
  assert.equal(averageRating([0, 5]), 2.5);
  assert.equal(ratingSchema.safeParse(6).success, false);
});
test("enquiry boundary rejects mass assignment, price tampering and excessive Unicode", () => {
  const p = {
    productId: crypto.randomUUID(),
    quantity: 1,
    options: [],
    message: "",
    budgetPaise: 0,
    occasion: "",
    pincode: "",
    consent: true,
    idempotencyKey: crypto.randomUUID(),
    challenge: "test",
  };
  assert.equal(enquirySchema.safeParse(p).success, true);
  for (const extra of [
    { userId: "attacker" },
    { pricePaise: 1 },
    { quantity: -1 },
    { quantity: 1.5 },
    { message: "🎁".repeat(501) },
    { consent: false },
  ])
    assert.equal(enquirySchema.safeParse({ ...p, ...extra }).success, false);
  assert.equal(
    enquirySchema.safeParse({ ...p, message: "🎁".repeat(500) }).success,
    true,
  );
});
test("URL filters bound server workload and reject invalid ranges and sorts", () => {
  assert.equal(
    parseFilters({
      category: ["gift-hampers", "bouquets"],
      min: "0",
      max: "1000",
      page: "2",
    }).success,
    true,
  );
  for (const f of [
    { min: "100", max: "10" },
    { sort: "sql" },
    { limit: "49" },
    { page: "0" },
    { category: Array(21).fill("a") },
    { q: "x".repeat(101) },
    { unknown: "value" },
  ])
    assert.equal(parseFilters(f).success, false);
});
test("return path cannot cross origins or enter admin", () => {
  assert.equal(
    safeReturnPath("/shop?category=gift-hampers"),
    "/shop?category=gift-hampers",
  );
  for (const s of [
    "//evil.example",
    "/%5cevil",
    "https://evil.example",
    "/admin",
    "%2F%2Fevil",
    "/%00evil",
    "/%252f%252fevil",
    "/shop/../../api/admin/workspace",
    "/product/%2e%2e/%2e%2e/auth/callback",
    "/shop/.%2e/admin",
    "/orders/%252e%252e/admin",
  ])
    assert.equal(safeReturnPath(s), "/account");
  assert.equal(safeReturnPath("/shop/../orders?page=2"), "/orders?page=2");
  assert.equal(safeReturnPath("/product/a-gift"), "/product/a-gift");
});
test("admin limits reject expired idle, stale MFA, wrong audience and revoked role", () => {
  const now = Date.now();
  const valid: SessionPolicy = {
    audience: "admin",
    assurance: "aal2",
    mfaAt: new Date(now - 60000).toISOString(),
    revokedAt: null,
    lastActiveAt: new Date(now - 60000).toISOString(),
    absoluteExpiresAt: new Date(now + 3600000).toISOString(),
    role: "owner",
    activeRole: true,
  };
  assert.equal(permitsAdmin(valid, now, true, true), true);
  for (const change of [
    { audience: "customer" as const },
    { assurance: "aal1" as const },
    { role: "editor" as const },
    { activeRole: false },
    { revokedAt: new Date(now).toISOString() },
    { lastActiveAt: new Date(now - 30 * 60000).toISOString() },
    { mfaAt: new Date(now - 5 * 60000).toISOString() },
    { absoluteExpiresAt: new Date(now).toISOString() },
  ])
    assert.equal(permitsAdmin({ ...valid, ...change }, now, true, true), false);
});
test("CSV and structured JSON do not activate formula or closing script content", () => {
  assert.equal(csvCell("=1+1"), `"'=1+1"`);
  assert.equal(csvCell("  @SUM(A1)"), `"'  @SUM(A1)"`);
  assert.equal(csvCell('A"B'), '"A""B"');
  assert.ok(
    !jsonLd({ name: "</script><script>alert(1)</script>" }).includes("<"),
  );
});
test("WhatsApp uses country-aware destination and encodes intentional text only", () => {
  assert.equal(whatsappNumber("0091 98765"), null);
  assert.equal(whatsappNumber("1234567"), null);
  const r: Receipt = {
    code: "GFT-2610-000001-123456789ABC",
    name: "A little & lovely gift",
    slug: "gift",
    quantity: 2,
    options: [{ label: "Gift note: included", deltaPaise: 0 }],
    message: "Hi & happy birthday 🎁",
    budgetPaise: 0,
    occasion: "Birthday",
    pincode: "400001",
    estimatePaise: 0,
    number: "12025550123",
  };
  const h = buildWhatsApp(r, "https://example.test");
  const u = new URL(h.url);
  assert.equal(u.hostname, "wa.me");
  assert.equal(u.searchParams.get("text"), h.message);
  assert.ok(h.message.includes("Budget: INR 0.00"));
  assert.ok(!h.message.includes("token="));
  const long = buildWhatsApp(
    {
      ...r,
      options: Array.from({ length: 20 }, () => ({
        label: "x".repeat(120),
        deltaPaise: 0,
      })),
    },
    "https://example.test",
  );
  assert.equal(long.shortened, true);
  assert.ok([...new URL(long.url).searchParams.get("text")!].length <= 1500);
  assert.ok(long.message.length > 1500);
});

test("primary login cannot add a new factor around an existing verified factor", () => {
  assert.equal(canEnrollInitialFactor("aal1", []), true);
  assert.equal(
    canEnrollInitialFactor("aal1", [{ status: "unverified" }]),
    true,
  );
  assert.equal(canEnrollInitialFactor("aal1", [{ status: "verified" }]), false);
  assert.equal(canEnrollInitialFactor("aal2", []), false);
  assert.equal(canEnrollInitialFactor("aal1", [{ status: "unknown" }]), false);
});
