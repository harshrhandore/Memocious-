import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  HttpError,
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { requirePhase2 } from "@/lib/phase2";
export const dynamic = "force-dynamic";
import { reviewSchema } from "@/lib/phase2-domain";
export async function GET(req: NextRequest) {
  try {
    requirePhase2();
    const s = await requireCustomerSession();
    const product = req.nextUrl.searchParams.get("product");
    if (product && !z.uuid().safeParse(product).success)
      throw new HttpError(422, "Invalid gift.");
    return safeJson(
      product
        ? await rpc("memocious_my_review", { sid: s.id, product })
        : await rpc("memocious_my_reviews", { sid: s.id }),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = reviewSchema.parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    return safeJson(
      await rpc("memocious_review", {
        sid: s.id,
        product: b.product,
        expected_version: b.expectedVersion,
        action: b.action,
        stars: b.stars,
        review_text: b.body,
        first_name: b.firstName,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
