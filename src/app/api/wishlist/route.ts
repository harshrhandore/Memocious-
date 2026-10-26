import { phase2Ready } from "@/lib/config";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!phase2Ready) throw new HttpError(503, "Wishlists are being set up.");
    const s = await requireCustomerSession();
    return safeJson(await rpc("memocious_wishlist", { sid: s.id }));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!phase2Ready) throw new HttpError(503, "Wishlists are being set up.");
    await guardMutation(req);
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = z
      .strictObject({ product: z.uuid(), saved: z.boolean() })
      .safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the gift and try again.");
    // Share the existing account-write budget with profile changes.
    await rateLimit(req, "profile", s.userId!);
    return safeJson(await rpc("memocious_wishlist", { sid: s.id, ...b.data }));
  } catch (e) {
    return failure(e);
  }
}
