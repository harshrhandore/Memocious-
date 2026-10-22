// Run hourly in the approved Node host with server-only environment bindings. Never print paths or credentials.
import { cleanupMedia } from "../src/lib/media-cleanup.mjs";
import { createClient } from "@supabase/supabase-js";
if (
  !process.env.SUPABASE_URL ||
  !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
)
  throw new Error("Configure the server's Supabase credentials.");
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const result = await cleanupMedia(db);
console.log(JSON.stringify(result));
if (result.failed) process.exitCode = 1;
