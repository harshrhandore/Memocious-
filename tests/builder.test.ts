import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builderPayload,
  draftMutation,
  budgetPresets,
  emptyBuilderPayload,
  normalizeBuilderDraft,
  configurationComplete,
  type BuilderDraft,
  type BuilderChoice,
} from "../src/lib/builder-domain";
test("builder budget boundaries have one deliberate preset including exact 500/1000/2000", () => {
  for (const n of [0, 49999, 50000, 99999, 100000, 199999, 200000, 100000000])
    assert.equal(
      budgetPresets.filter((p) => n >= p.min && n <= p.max).length,
      1,
    );
});
test("draft schema allows partial exploration but rejects authority, estimates, unknown versions and oversized text", () => {
  assert.ok(builderPayload.safeParse(emptyBuilderPayload).success);
  assert.ok(
    builderPayload.safeParse({
      ...emptyBuilderPayload,
      message: "\u{1f381}".repeat(500),
    }).success,
  );
  for (const v of [
    { ...emptyBuilderPayload, userId: "x" },
    { ...emptyBuilderPayload, estimatePaise: 0 },
    { ...emptyBuilderPayload, message: "x".repeat(501) },
    { ...emptyBuilderPayload, budgetMinPaise: 50000, budgetMaxPaise: 49999 },
  ])
    assert.equal(builderPayload.safeParse(v).success, false);
  assert.equal(
    draftMutation.safeParse({
      action: "create",
      id: "12345678-1234-4234-8234-123456789012",
      expectedVersion: 0,
      schemaVersion: 3,
      step: 1,
      payload: emptyBuilderPayload,
    }).success,
    false,
  );
});

test("schema 1 draft upgrades preserve words and return to product selection", () => {
  const d = normalizeBuilderDraft({
    id: "fixture",
    version: 3,
    schemaVersion: 1,
    step: 4,
    payload: {
      message: "Preserve me",
      recipient: "Friend",
      budgetMinPaise: 0,
      budgetMaxPaise: 1000,
      giftTypeId: null,
      occasionId: null,
    },
    expiresAt: "",
    updatedAt: "",
  } as BuilderDraft);
  assert.equal(d.step, 2);
  assert.equal(d.payload.message, "Preserve me");
  assert.equal(d.payload.productId, null);
  assert.deepEqual(d.payload.options, []);
});
test("configuration requires actual options and schema 2 rejects incomplete final contact", () => {
  const id = "12345678-1234-4234-8234-123456789012";
  const choice = {
    id,
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
  } as BuilderChoice;
  assert.equal(configurationComplete(emptyBuilderPayload, choice), false);
  assert.equal(
    configurationComplete({ ...emptyBuilderPayload, options: [id] }, choice),
    true,
  );
  assert.equal(
    draftMutation.safeParse({
      action: "create",
      id,
      expectedVersion: 0,
      schemaVersion: 2,
      step: 8,
      payload: emptyBuilderPayload,
    }).success,
    false,
  );
  assert.equal(
    builderPayload.parse({
      ...emptyBuilderPayload,
      contact: { ...emptyBuilderPayload.contact, phone: "+447700900123" },
    }).contact.phone,
    "447700900123",
  );
});
