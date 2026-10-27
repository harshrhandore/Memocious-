import type { NextRequest } from "next/server";
import { z } from "zod";
import { phase3Ready } from "@/lib/config";
import { catalogueGateEnabled } from "@/lib/catalogue";
import { requireCustomerSession } from "@/lib/session";
import { rpc } from "@/lib/server-db";
import { safeJson, failure, HttpError } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    if (!phase3Ready)
      throw new HttpError(503, "Gift configurations are being set up.");
    if (await catalogueGateEnabled()) await requireCustomerSession();
    const type = z.uuid().parse(req.nextUrl.searchParams.get("type"));
    const selected = req.nextUrl.searchParams.get("selected");
    if (selected) z.uuid().parse(selected);
    return safeJson(
      await rpc("memocious_builder_choices", {
        gift_type: type,
        selected_product: selected,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
