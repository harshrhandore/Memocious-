import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireBuilder } from "@/lib/builder-server";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
const states = z.enum([
  "new",
  "contacted",
  "quote_sent",
  "negotiation",
  "won",
  "lost",
  "closed",
  "cancelled",
]);
const fields = z
  .object({
    status: states,
    reason: z.string().trim().min(1).max(2000),
    quotePaise: z.number().int().min(0).max(1e12).nullable(),
    terms: z.string().max(4000),
    validUntil: z.iso.date().nullable(),
    agreement: z.boolean(),
  })
  .strict();
const mutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("update"),
      id: z.uuid(),
      version: z.number().int().positive(),
      fields,
    })
    .strict(),
  z
    .object({
      action: z.literal("convert"),
      id: z.uuid(),
      version: z.number().int().positive(),
    })
    .strict(),
]);
export async function GET(req: NextRequest) {
  try {
    requireBuilder();
    const s = await requireAdminSession(true);
    return safeJson(
      await rpc("memocious_admin_custom", {
        sid: s.id,
        page_num: z.coerce
          .number()
          .int()
          .min(1)
          .max(10000)
          .parse(req.nextUrl.searchParams.get("page") ?? 1),
        search_code: z
          .string()
          .regex(/^[a-zA-Z0-9-]{0,40}$/)
          .parse(req.nextUrl.searchParams.get("code") ?? ""),
        status_filter: z
          .union([states, z.literal("")])
          .parse(req.nextUrl.searchParams.get("status") ?? ""),
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requireBuilder();
    const s = await requireAdminSession(true, true);
    await rateLimit(req, "admin-product", s.userId!);
    const b = mutation.parse(await readBody(req));
    return safeJson(
      await rpc("memocious_admin_custom", {
        sid: s.id,
        action: b.action,
        request_id: b.id,
        expected_version: b.version,
        ...(b.action === "update" ? { fields: b.fields } : {}),
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
