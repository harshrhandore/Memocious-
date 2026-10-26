import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePhase2 } from "@/lib/phase2";
import {
  readSession,
  bindSessionCsrf,
  requireAdminSession,
} from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await readSession();
    await bindSessionCsrf(s);
    const b = z
      .strictObject({
        kind: z.enum(["review", "enterprise", "proof"]),
        parent: z.uuid(),
        bytes: z.number().int().min(1).max(2097152),
        mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
        consent: z.boolean(),
      })
      .parse(await readBody(req));
    if (b.kind === "proof") await requireAdminSession(true, true);
    await rateLimit(req, "admin-upload", s.userId ?? s.id);
    return safeJson({
      id: await rpc("memocious_asset_begin", { sid: s.id, ...b }),
    });
  } catch (e) {
    return failure(e);
  }
}
