import type { NextRequest } from "next/server";
import { phase4Ready } from "@/lib/config";
import { requireAdminSession } from "@/lib/session";
import { rpc } from "@/lib/server-db";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { ownerOrderMutation, ownerOrderQuery } from "@/lib/owner-order-domain";
export const dynamic = "force-dynamic";
function ready() {
  if (!phase4Ready)
    throw new HttpError(503, "Order management is being set up.");
}
export async function GET(req: NextRequest) {
  try {
    ready();
    const s = await requireAdminSession(true);
    const q = ownerOrderQuery.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    await rateLimit(req, "admin-product", s.userId!);
    return safeJson(
      await rpc("memocious_owner_orders", {
        sid: s.id,
        order_code: q.code ?? null,
        page_num: q.page,
        event_page: q.eventPage,
        status_filter: q.status,
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    ready();
    const s = await requireAdminSession(true, true);
    await rateLimit(req, "admin-product", s.userId!);
    const b = ownerOrderMutation.parse(await readBody(req));
    return safeJson(
      await rpc("memocious_owner_order_action", {
        sid: s.id,
        order_id: b.id,
        expected_version: b.version,
        request_key: b.requestKey,
        action: b.action,
        fields: b.fields,
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
