import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePhase2 } from "@/lib/phase2";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc, serverDb } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await requireAdminSession(true, true);
    const b = z.strictObject({ id: z.uuid() }).parse(await readBody(req));
    await rateLimit(req, "admin-media", s.userId!);
    const meta = await rpc<{ path: string; copy: string }>("memocious_asset", {
      sid: s.id,
      asset: b.id,
      action: "publish",
    });
    const storage = serverDb().storage.from("memocious-sanitized");
    const existing = await storage.download(meta.copy);
    if (existing.error) {
      const copy = await storage.copy(meta.path, meta.copy);
      if (copy.error)
        throw new HttpError(503, "Public copy could not be prepared.");
    }
    await rpc("memocious_asset", {sid:s.id,asset:b.id,action:"published"});
    return safeJson({
      message:
        "Sanitized public copy prepared. Approve the review or activate the proof item to publish.",
    });
  } catch (e) {
    return failure(e);
  }
}
