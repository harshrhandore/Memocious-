import { cleanupBuilderFiles } from "../../src/lib/builder-file-cleanup.mjs";
import { cleanupPhase2 } from "../../src/lib/phase2-cleanup.mjs";
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
  if (Netlify.env.get("PHASE_2_ENABLED") === "true") {
    const phase2 = await cleanupPhase2(db);
    console.log(JSON.stringify(phase2));
    if (phase2.failed) throw new Error("Phase 2 cleanup requires retry");
  }
  if (Netlify.env.get("PHASE_3_ENABLED") === "true" && Netlify.env.get("PHASE_2_ENABLED") === "true") {
    const files = await cleanupBuilderFiles(db);
    console.log(JSON.stringify(files));
    if(files.failed)throw new Error("Builder file cleanup requires retry");
    const draftCleanup = await db.rpc("memocious_builder_cleanup");
    if (draftCleanup.error) throw new Error("Builder draft cleanup requires retry");
    console.log(JSON.stringify(draftCleanup.data));
  }
  return Response.json(result);
};
// Every hour at minute 17 UTC; no customer-local-time dependency. Scheduled invocations only.
export const config = { schedule: "17 * * * *" };
