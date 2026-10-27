import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireBuilder } from "@/lib/builder-server";
import { config } from "@/lib/config";
import { getPublicSettings } from "@/lib/catalogue";
import { requireCustomerSession } from "@/lib/session";
import { safeJson, failure } from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { customHandoff, type CustomReceipt } from "@/lib/custom-request";
export async function GET(req: NextRequest) {
  try {
    requireBuilder();
    const s = await requireCustomerSession();
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(req.nextUrl.searchParams.get("page") ?? 1);
    const result = await rpc<{ records: CustomReceipt[]; hasMore: boolean }>(
      "memocious_custom_requests",
      { sid: s.id, page_num: page },
    );
    const settings = await getPublicSettings();
    return safeJson({
      ...result,
      records: result.records.map((r) =>
        customHandoff(r, settings.whatsappNumber ?? null, config.APP_ORIGIN),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
