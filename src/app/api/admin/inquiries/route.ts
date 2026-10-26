import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePhase2 } from "@/lib/phase2";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function GET(req: NextRequest) {
  try {
    requirePhase2();
    const s = await requireAdminSession(true);
    return safeJson(
      await rpc("memocious_admin_inquiries", {
        sid: s.id,
        page_num: z.coerce
          .number()
          .int()
          .min(1)
          .max(10000)
          .parse(req.nextUrl.searchParams.get("page") ?? 1),
      }),
    );
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
        entity: z.uuid(),
        expectedVersion: z.number().int().positive().nullable(),
        action: z.enum([
          "update",
          "convert",
          "contact-reviewed",
          "privacy-reviewing",
        ]),
        fields: z
          .strictObject({
            pipeline: z.enum([
              "new",
              "contacted",
              "quote_sent",
              "negotiation",
              "won",
              "lost",
            ]),
            reason: z.string().trim().min(1).max(2000),
            quotePaise: z.number().int().min(0).max(1000000000000).nullable(),
            terms: z.string().trim().max(4000),
            agreement: z.boolean(),
            validUntil: z.iso.date().nullable(),
          })
          .optional(),
      })
      .parse(await readBody(req));
    await rateLimit(req, "admin-product", s.userId!);
    return safeJson(
      await rpc("memocious_admin_inquiries", {
        sid: s.id,
        entity: b.entity,
        expected_version: b.expectedVersion,
        action: b.action,
        fields: b.fields ?? {},
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
