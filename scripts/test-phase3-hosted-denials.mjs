import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (url !== "https://bpvtdehesnlgwccmrlhz.supabase.co" || !key)
  throw Error("This probe is restricted to configured Memocious staging.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const evidence = {
  date: new Date().toISOString(),
  project: "bpvtdehesnlgwccmrlhz",
  scope:
    "Actual unauthenticated Supabase HTTP probes, not signed-in customer/provider or hosted BFF coverage",
  checks: [],
};
const catalogue = await db.rpc("memocious_catalogue", { filters: {} });
assert.ifError(catalogue.error);
evidence.checks.push({
  name: "Public catalogue control request",
  status: "PASS",
});
const sid = randomUUID(),
  draft = randomUUID();
for (const [name, args] of [
  ["memocious_builder_draft", { sid, action: "list" }],
  [
    "memocious_builder_file_begin",
    { sid, draft, expected_version: 1, bytes: 100, declared_mime: "image/png" },
  ],
  ["memocious_builder_file", { sid, file_id: randomUUID(), action: "read" }],
  [
    "memocious_builder_submit",
    {
      sid,
      draft,
      expected_version: 1,
      request_key: randomUUID(),
      consent: true,
      accept_estimate: true,
    },
  ],
  ["memocious_custom_requests", { sid }],
  ["memocious_admin_custom", { sid }],
]) {
  const r = await db.rpc(name, args);
  assert.equal(r.error?.code, "42501", `${name} must deny anonymous execution`);
  evidence.checks.push({
    name: `Anonymous ${name} denied`,
    status: "PASS",
    code: r.error.code,
  });
}
const upload = await db.storage
  .from("memocious-quarantine")
  .upload(
    "builder/" + randomUUID(),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
    { contentType: "image/png", upsert: false },
  );
assert.ok(upload.error, "Anonymous private storage upload must be denied");
assert.ok(
  ["400", "401", "403"].includes(String(upload.error.statusCode)),
  "Must be authorization denial, not a network failure",
);
evidence.checks.push({
  name: "Anonymous private quarantine upload denied",
  status: "PASS",
  httpStatus: Number(upload.error.statusCode),
});
await writeFile(
  "evidence/phase-3-hosted-denials.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
