import { test } from "node:test";
import assert from "node:assert/strict";
import { clearPendingOwnerEnrollment } from "../src/lib/mfa-enrollment";

test("restart removes only this flow's unfinished TOTP, preserving verified and unrelated factors", async () => {
  const removed: string[] = [];
  await clearPendingOwnerEnrollment([
    { id: "pending", status: "unverified", factor_type: "totp", friendly_name: "Memocious owner" },
    { id: "verified", status: "verified", factor_type: "totp", friendly_name: "Memocious owner" },
    { id: "other", status: "unverified", factor_type: "totp", friendly_name: "Other app" },
  ], async (id) => { removed.push(id); return { error: null }; });
  assert.deepEqual(removed, ["pending"]);
});

test("restart stops if the provider cannot remove the unfinished factor", async () => {
  const error = new Error("Provider unavailable");
  await assert.rejects(clearPendingOwnerEnrollment([
    { id: "pending", status: "unverified", factor_type: "totp", friendly_name: "Memocious owner" },
  ], async () => ({ error })), error);
});
