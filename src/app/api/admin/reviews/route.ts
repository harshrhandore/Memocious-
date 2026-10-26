import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { requirePhase2 } from "@/lib/phase2";
export async function GET() {
  try {
    requirePhase2();
    const s = await requireAdminSession(true);
    return safeJson(await rpc("memocious_admin_reviews", { sid: s.id }));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await requireAdminSession(true, true);
    const b = z
      .strictObject({
        id: z.uuid().nullable(),
        version: z.number().int().positive().nullable(),
        action: z.enum(["approve", "reject", "delete", "report-reviewed"]),
        note: z.string().trim().max(2000),
        reportId: z.uuid().nullable(),
      })
      .parse(await readBody(req));
    await rateLimit(req, "admin-product", s.userId!);
    return safeJson(
      await rpc("memocious_admin_reviews", {
        sid: s.id,
        review_id: b.id,
        expected_version: b.version,
        action: b.action,
        note: b.note,
        report_id: b.reportId,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
