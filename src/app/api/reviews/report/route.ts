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
      .strictObject({
        key: z.string().regex(/^[a-f0-9]{32}$/),
        reason: z.string().trim().min(1).max(2000),
      })
      .parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    await rpc("memocious_review_report", {
      sid: s.id,
      review_key: b.key,
      report_reason: b.reason,
    });
    return safeJson({ message: "Report saved for owner review." });
  } catch (e) {
    return failure(e);
  }
}
