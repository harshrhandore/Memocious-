import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reviewSchema,
  enterpriseFields,
  addressSchema,
} from "../src/lib/phase2-domain";
import { cataloguePdf } from "../src/lib/catalogue-pdf";
const id = "12345678-1234-4234-8234-123456789012";
test("review zero is deliberate; empty rating and authority injection fail", () => {
  const r = {
    product: id,
    expectedVersion: 0,
    action: "save",
    stars: 0,
    body: "A real zero",
    firstName: "Test",
  };
  assert.equal(reviewSchema.parse(r).stars, 0);
  for (const v of [
    { ...r, stars: null },
    { ...r, stars: 6 },
    { ...r, status: "approved" },
    { ...r, userId: id },
    { ...r, firstName: "Full Name" },
  ])
    assert.equal(reviewSchema.safeParse(v).success, false);
});
test("enterprise and address boundaries reject duplicate gifts, inverted budgets and owner reassignment", () => {
  const e = {
    contactName: "Test",
    email: "fixture@example.invalid",
    notes: "Test",
    consent: true,
    organization: "Test",
    organizationType: "company",
    role: "Test",
    phone: "+447700900123",
    gstin: "",
    items: [{ product: id, quantity: 10 }],
    branding: { colours: "", text: "" },
    deadline: "2027-01-01",
    city: "Test",
    pincode: "400001",
    budgetMinPaise: 0,
    budgetMaxPaise: 1000,
  };
  assert.equal(enterpriseFields.parse(e).phone, "447700900123");
  assert.equal(
    enterpriseFields.safeParse({ ...e, items: [...e.items, ...e.items] })
      .success,
    false,
  );
  assert.equal(
    enterpriseFields.safeParse({ ...e, budgetMinPaise: 2000 }).success,
    false,
  );
  assert.equal(
    addressSchema.safeParse({
      action: "delete",
      id,
      expectedVersion: 1,
      userId: id,
    }).success,
    false,
  );
});
test("server catalogue emits bounded static PDF with escaped PDF text and valid xref", () => {
  const pdf = cataloguePdf({
    title: "Catalogue ) /JavaScript (",
    lines: [
      {
        name: "Gift \\ (test)",
        description: "<script>alert(1)</script>",
        moq: 10,
        leadDays: 3,
        pricePaise: 0,
      },
    ],
  }).toString("ascii");
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.endsWith("%%EOF"));
  assert.ok(!pdf.includes("/OpenAction"));
  assert.ok(!pdf.includes("/EmbeddedFiles"));
  const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(pdf.slice(xref, xref + 4), "xref");
  assert.ok(pdf.includes("From INR 0.00"));
});
