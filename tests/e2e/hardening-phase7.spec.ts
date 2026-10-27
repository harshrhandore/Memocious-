import { test, expect } from "@playwright/test";

test("recovery, callback and private responses suppress referrers and caching", async ({
  request,
}) => {
  for (const path of [
    "/reset-password?token_hash=isolated-noncredential-fixture",
    "/auth/callback?code=isolated-noncredential-fixture",
    "/account",
    "/api/session",
    "/api/admin/workspace",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["content-security-policy"]).not.toContain(
      "'unsafe-eval'",
    );
  }
});

test("mutation guards reject cross-site requests and JSON lookalike media types", async ({
  request,
}) => {
  const session = await request.get("/api/session");
  const headers = {
    Origin: "http://localhost:3000",
    "X-CSRF-Token": (await session.json()).csrf,
    "Content-Type": "application/json",
  };
  const rejectedHeaders: Record<string, string>[] = [
    { Origin: "https://attacker.invalid" },
    { Origin: "http://localhost:3001" },
    { "Sec-Fetch-Site": "cross-site" },
    { "X-CSRF-Token": "incorrect" },
  ];
  for (const rejected of rejectedHeaders) {
    const response = await request.post("/api/auth/start", {
      headers: { ...headers, ...rejected },
      data: "{}",
    });
    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  for (const media of [
    "application/jsonp",
    "application/json-extra",
    "text/plain",
  ]) {
    const response = await request.post("/api/auth/start", {
      headers: { ...headers, "Content-Type": media },
      data: "{}",
    });
    expect(response.status()).toBe(415);
  }
  const supported = await request.post("/api/auth/start", {
    headers: { ...headers, "Content-Type": "application/json; charset=UTF-8" },
    data: "{}",
  });
  expect(supported.status()).toBe(503); // Demo has no provider; the request passed format guards only.
});
