import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builderPayload,
  draftMutation,
  budgetPresets,
  emptyBuilderPayload,
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
      schemaVersion: 2,
      step: 1,
      payload: emptyBuilderPayload,
    }).success,
    false,
  );
});
