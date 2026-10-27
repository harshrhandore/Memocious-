import { test } from "node:test";
import assert from "node:assert/strict";
import { auditQuery, auditDates } from "../src/lib/audit-domain";
test("audit queries bound date ranges and require paired snapshot cursors", () => {
  assert.equal(
    auditQuery.safeParse({ from: "2026-01-01", to: "2026-03-31" }).success,
    true,
  );
  for (const q of [
    { from: "2026-01-01", to: "2026-04-01" },
    { from: "2026-02-01", to: "2026-01-01" },
    { cursorAt: "2026-10-01T00:00:00Z" },
    { action: "email@example.com" },
    { entityId: "not-a-uuid" },
    { ownerId: "other" },
  ])
    assert.equal(auditQuery.safeParse(q).success, false);
  assert.equal(
    auditQuery.safeParse({
      cursorAt: "2026-10-01T00:00:00Z",
      cursorId: "11111111-1111-4111-8111-111111111111",
      asOf: "2026-10-02T00:00:00Z",
    }).success,
    true,
  );
});
test("audit default dates follow Kolkata business days across UTC midnight", () => {
  assert.deepEqual(auditDates(new Date("2026-10-27T19:00:00Z")), {
    from: "2026-09-29",
    to: "2026-10-28",
  });
});
