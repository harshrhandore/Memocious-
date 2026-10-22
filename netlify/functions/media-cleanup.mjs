import { createClient } from "@supabase/supabase-js";
import { cleanupMedia } from "../../src/lib/media-cleanup.mjs";
export default async () => {
  if (Netlify.env.get("APP_MODE") !== "live")
    return Response.json({ disabled: true });
  const url = Netlify.env.get("SUPABASE_URL"),
    key =
      Netlify.env.get("SUPABASE_SECRET_KEY") ||
      Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Cleanup configuration unavailable");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(2000) }),
    },
  });
  const result = await cleanupMedia(db);
  console.log(JSON.stringify(result));
  if (result.failed) throw new Error("Media cleanup requires retry");
  return Response.json(result);
};
// Every hour at minute 17 UTC; no customer-local-time dependency. Scheduled invocations only.
export const config = { schedule: "17 * * * *" };
