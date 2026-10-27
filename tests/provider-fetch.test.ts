import test from "node:test";
import assert from "node:assert/strict";
import { providerFetch } from "../src/lib/provider-fetch";

test("provider fetch retains request data but forbids shared caching", async (t) => {
  const headers = { "Content-Type": "application/json", "X-Fixture": "only" };
  const upstream = t.mock.method(globalThis, "fetch", async (_input, init) => {
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, '{"quantity":0}');
    assert.deepEqual(init?.headers, headers);
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response('{"accepted":true}', {
      headers: { "Content-Type": "application/json" },
    });
  });
  const result = await providerFetch("https://provider.invalid/fixture", {
    method: "POST",
    headers,
    body: '{"quantity":0}',
    cache: "force-cache",
  });
  assert.deepEqual(await result.json(), { accepted: true });
  assert.equal(upstream.mock.callCount(), 1);
});

test("provider fetch preserves cancellation from both Request and init", async (t) => {
  const captured: AbortSignal[] = [];
  t.mock.method(globalThis, "fetch", async (_input, init) => {
    captured.push(init!.signal!);
    return new Response("fixture");
  });
  const requestAbort = new AbortController();
  const initAbort = new AbortController();
  await providerFetch(
    new Request("https://provider.invalid/fixture", {
      signal: requestAbort.signal,
    }),
    { signal: initAbort.signal },
  );
  requestAbort.abort("request cancelled");
  assert.equal(captured[0].reason, "request cancelled");

  await providerFetch("https://provider.invalid/fixture", {
    signal: initAbort.signal,
  });
  initAbort.abort("operation cancelled");
  assert.equal(captured[1].reason, "operation cancelled");
});

test("a stalled provider call aborts at the shared deadline without retry", async (t) => {
  const keepAlive = setTimeout(() => {}, 15_000);
  const upstream = t.mock.method(
    globalThis,
    "fetch",
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener(
          "abort",
          () => reject(init!.signal!.reason),
          { once: true },
        );
      }),
  );
  try {
    await assert.rejects(providerFetch("https://provider.invalid/fixture"), {
      name: "TimeoutError",
    });
    assert.equal(upstream.mock.callCount(), 1);
  } finally {
    clearTimeout(keepAlive);
  }
});
