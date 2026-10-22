import "server-only";
import { z } from "zod";
const schema = z.object({
  APP_MODE: z.enum(["demo", "live"]).default("demo"),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  REQUIRE_LOGIN_BEFORE_BROWSING: z.enum(["true", "false"]).default("false"),
  RATE_LIMIT_STORE: z.enum(["postgres", "redis"]).default("postgres"),
  POLICIES_APPROVED: z.enum(["true", "false"]).default("false"),
});
export const config = schema.parse(process.env);
if (
  process.env.NODE_ENV === "production" &&
  config.APP_MODE === "live" &&
  !config.APP_ORIGIN.startsWith("https://")
)
  throw new Error("Live APP_ORIGIN must use HTTPS.");
export const demo = config.APP_MODE === "demo";
export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const authReady =
  !!supabaseSecretKey &&
  (config.RATE_LIMIT_STORE === "postgres" ||
    (!!process.env.UPSTASH_REDIS_REST_URL &&
      !!process.env.UPSTASH_REDIS_REST_TOKEN)) &&
  !demo &&
  config.POLICIES_APPROVED === "true" &&
  [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SESSION_ENCRYPTION_KEY",
    "IP_HASH_KEY",
    "TURNSTILE_SECRET_KEY",
    "TURNSTILE_SITE_KEY",
  ].every((k) => !!process.env[k]);
export const writesReady = authReady && config.POLICIES_APPROVED === "true";
