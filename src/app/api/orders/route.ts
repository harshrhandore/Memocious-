import type { NextRequest } from "next/server";
import { phase4Ready } from "@/lib/config";
import { orderQuery } from "@/lib/order-domain";
import { requireCustomerSession } from "@/lib/session";
import { safeJson, failure, HttpError } from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function GET(req: NextRequest) {
  try {
    if (!phase4Ready)
      throw new HttpError(503, "Order tracking is being set up.");
    const s = await requireCustomerSession();
    const query = orderQuery.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    return safeJson(
      await rpc("memocious_customer_orders", {
        sid: s.id,
        order_code: query.code ?? null,
        page_num: query.page,
        event_page: query.eventPage,
      }),
    );
  } catch (e) {
    if (e instanceof HttpError && e.status === 403)
      return failure(
        new HttpError(404, "This order is unavailable for your account."),
      );
    return failure(e);
  }
}
