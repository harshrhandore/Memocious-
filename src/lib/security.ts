import "server-only";
import { ZodError } from "zod";
import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ingressIP } from "./ingress";
import { config, authReady } from "./config";
export const randomToken = () => randomBytes(32).toString("base64url");
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function equal(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export const cookieOptions = {
  httpOnly: true,
  secure: config.APP_ORIGIN.startsWith("https://"),
  sameSite: "lax" as const,
  path: "/",
};
export const cookieName = config.APP_ORIGIN.startsWith("https://")
  ? "__Host-memocious"
  : "memocious.dev";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter = 60,
  ) {
    super(message);
  }
}
export function safeJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(e: unknown) {
  if (e instanceof ZodError)
    e = new HttpError(422, "Check the submitted details.");
  if (e instanceof HttpError) {
    const response = safeJson(
      { message: e.message, requestId: crypto.randomUUID() },
      e.status,
    );
    if (e.status === 429)
      response.headers.set("Retry-After", String(e.retryAfter));
    return response;
  }
  return safeJson(
    {
      message: "Temporarily unavailable. Please try again shortly.",
      requestId: crypto.randomUUID(),
    },
    503,
  );
}
export async function csrf() {
  const jar = await cookies();
  let value = jar.get(cookieName + ".csrf")?.value;
  if (!value) {
    value = randomToken();
    const opaque = jar.get(cookieName)?.value;
    if (authReady && opaque) {
      const { rpc } = await import("./server-db");
      try {
        await rpc("memocious_csrf_rotate", {
          cookie_hash: hash(opaque),
          new_csrf_hash: hash(value),
        });
      } catch (error) {
        // An expired/revoked database session can outlive its browser cookie.
        // Treat that as a signed-out visitor so /api/session can issue a fresh
        // CSRF token instead of failing before it can return JSON.
        if (!(error instanceof HttpError) || error.status !== 401) throw error;
        jar.delete(cookieName);
      }
    }
    jar.set(cookieName + ".csrf", value, { ...cookieOptions, maxAge: 3600 });
  }
  return value;
}
export async function guardMutation(req: NextRequest, binary = false) {
  if (
    req.headers.get("origin") !== config.APP_ORIGIN ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Request unavailable.");
  if (
    !binary &&
    req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !==
      "application/json"
  )
    throw new HttpError(415, "Use a supported request format.");
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > (binary ? 5 * 1024 * 1024 : 16384))
    throw new HttpError(413, "Request too large.");
  const token = (await cookies()).get(cookieName + ".csrf")?.value;
  const submitted = req.headers.get("x-csrf-token");
  if (!token || !submitted || !equal(hash(token), hash(submitted)))
    throw new HttpError(403, "Refresh this page and try again.");
}
export async function readBody(req: NextRequest) {
  if (!req.body) throw new HttpError(400, "Request unavailable.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 16384) {
      await reader.cancel();
      throw new HttpError(413, "Request too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Check your request and try again.");
  }
}
export async function rateLimit(
  req: NextRequest,
  operation: string,
  actor?: string,
) {
  const redis = process.env.UPSTASH_REDIS_REST_URL,
    redisToken = process.env.UPSTASH_REDIS_REST_TOKEN,
    ipKey = process.env.IP_HASH_KEY;
  if (
    !ipKey ||
    !["vercel", "netlify"].includes(process.env.TRUSTED_INGRESS ?? "")
  )
    throw new HttpError(503, "This service is temporarily unavailable.");
  // Trust only the selected platform's connection header; reject absent/malformed values without a forwarded-chain fallback.
  const ip = ingressIP(req.headers, process.env.TRUSTED_INGRESS);
  if (!ip) throw new HttpError(503, "This service is temporarily unavailable.");
  const keyed = (s: string) =>
    createHmac("sha256", ipKey).update(s).digest("hex");
  if (config.RATE_LIMIT_STORE === "postgres") {
    const { rpc } = await import("./server-db");
    const result = await rpc<{ allowed: boolean; retryAfter: number }>(
      "memocious_rate_limit",
      {
        operation_name: operation,
        ip_hash: keyed(ip),
        actor_hash: keyed(actor ?? ip),
      },
    );
    if (!result.allowed)
      throw new HttpError(
        429,
        "Please wait before trying again.",
        result.retryAfter,
      );
    return ip;
  }
  if (!redis || !redisToken)
    throw new HttpError(503, "This service is temporarily unavailable.");
  const auth = operation === "auth";
  const enquiry = operation === "enquiry";
  const upload = operation === "admin-upload";
  const budgets = [
    [auth ? 60 : enquiry ? 600 : 60, auth ? 5 : enquiry ? 5 : 60],
    [
      auth || upload ? 3600 : enquiry ? 86400 : 60,
      auth || upload ? 10 : enquiry ? 20 : 30,
    ],
    [3600, 1000],
  ];
  const keys = [keyed(ip), keyed(actor ?? ip), "global"].map(
    (value, i) => `m:v2:${operation}:${i}:${value}`,
  );
  const script =
    "local out={};for i,k in ipairs(KEYS) do local n=redis.call('INCR',k);if n==1 then redis.call('EXPIRE',k,ARGV[i*2-1]) end;out[i]=n;end;return out";
  const r = await fetch(redis, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", script, 3, ...keys, ...budgets.flat()]),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new HttpError(503, "Please try again shortly.");
  const data = await r.json();
  if (
    !Array.isArray(data.result) ||
    data.result.length !== 3 ||
    !data.result.every((v: unknown) => Number.isSafeInteger(v))
  )
    throw new HttpError(503, "Please try again shortly.");
  if (data.result.some((v: number, i: number) => v > budgets[i][1]))
    throw new HttpError(429, "Please wait before trying again.");
  return ip;
}
export async function protect(
  req: NextRequest,
  operation: string,
  challenge: string,
  actor?: string,
) {
  const ip = await rateLimit(req, operation, actor);
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret)
    throw new HttpError(503, "This service is temporarily unavailable.");
  const verification = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: challenge, remoteip: ip }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!verification.ok) throw new HttpError(503, "Please try again shortly.");
  const v = await verification.json();
  const age = Date.now() - Date.parse(v.challenge_ts);
  if (
    !v.success ||
    v.action !== operation ||
    v.hostname !== new URL(config.APP_ORIGIN).hostname ||
    !Number.isFinite(age) ||
    age < -30000 ||
    age > 300000
  )
    throw new HttpError(
      403,
      "Please complete a new verification and try again.",
    );
}
