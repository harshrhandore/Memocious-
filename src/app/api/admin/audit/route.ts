import type { NextRequest } from "next/server";
import { phase5Ready } from "@/lib/config";
import { auditQuery } from "@/lib/audit-domain";
import { requireAdminSession } from "@/lib/session";
import { safeJson, failure, HttpError, rateLimit } from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function GET(req: NextRequest) {
  try {
    if (!phase5Ready)
      throw new HttpError(503, "Owner audit tools are being set up.");
    const s = await requireAdminSession(true, true);
    const q = auditQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
    await rateLimit(req, "admin-product", s.userId!);
    return safeJson(
      await rpc("memocious_owner_audit", {
        sid: s.id,
        from_day: q.from ?? null,
        to_day: q.to ?? null,
        action_prefix: q.action,
        entity_filter: q.entity,
        entity_key: q.entityId ?? null,
        request_key: q.requestId ?? null,
        cursor_at: q.cursorAt ?? null,
        cursor_id: q.cursorId ?? null,
        as_of: q.asOf ?? null,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
