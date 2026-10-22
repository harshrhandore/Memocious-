import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sealSession, unsealSession } from "../src/lib/session-crypto";
test("encrypted provider credentials support explicit key rotation and reject tampering", async () => {
  const old = {
    version: "old",
    current: randomBytes(32).toString("base64url"),
  };
  const current = {
    version: "current",
    current: randomBytes(32).toString("base64url"),
    previous: { old: old.current },
  };
  const original = await sealSession(
    {
      accessToken: "test-provider-credential",
      refreshToken: "test-refresh-credential",
    },
    old,
  );
  assert.equal(original.includes("test-provider-credential"), false);
  const recovered = await unsealSession<{ accessToken: string }>(
    original,
    current,
  );
  assert.equal(recovered.accessToken, "test-provider-credential");
  await assert.rejects(unsealSession(original, { ...current, previous: {} }));
  const segments = original.split(".");
  segments[3] = (segments[3][0] === "A" ? "B" : "A") + segments[3].slice(1);
  await assert.rejects(unsealSession(segments.join("."), current));
  const next = await sealSession({ value: "current" }, current);
  await assert.rejects(unsealSession(next, old));
});
