import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { requirePhase2 } from "@/lib/phase2";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = z
      .strictObject({ action: z.enum(["export", "delete-request"]) })
      .parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    return safeJson(
      await rpc("memocious_privacy", { sid: s.id, action: b.action }),
    );
  } catch (e) {
    return failure(e);
  }
}
