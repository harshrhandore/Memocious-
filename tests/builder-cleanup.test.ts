import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanupBuilderFiles } from "../src/lib/builder-file-cleanup.mjs";
const id = "12345678-1234-4234-8234-123456789012";
test("builder cleanup acknowledges deletion only after all storage removals succeed", async () => {
  const acknowledgements: unknown[] = [];
  let fail = true;
  const db = {
    rpc: async (_name: string, args?: unknown) => {
      if (args) {
        acknowledgements.push(args);
        return { data: [], error: null };
      }
      return {
        data: [
          {
            id,
            path: `builder/${id}.webp`,
            quarantine: `builder/${id}`,
            quarantineOnly: false,
          },
        ],
        error: null,
      };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async () => ({
          error: bucket === "memocious-sanitized" && fail ? {} : null,
        }),
      }),
    },
  };
  assert.equal((await cleanupBuilderFiles(db)).failed, 1);
  assert.equal(acknowledgements.length, 0);
  fail = false;
  assert.equal((await cleanupBuilderFiles(db)).processed, 1);
  assert.deepEqual(acknowledgements, [
    { file_id: id, finished: true, quarantine_only: false },
  ]);
});
test("builder cleanup refuses an unexpected object path before storage access", async () => {
  let touched = false;
  const db = {
    rpc: async () => ({
      data: [{ id, path: "another-user/object", quarantine: `builder/${id}` }],
      error: null,
    }),
    storage: {
      from: () => {
        touched = true;
        throw new Error("Must not run");
      },
    },
  };
  await assert.rejects(
    () => cleanupBuilderFiles(db),
    /Invalid builder cleanup record/,
  );
  assert.equal(touched, false);
});
