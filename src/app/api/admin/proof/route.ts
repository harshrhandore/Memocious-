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
export async function GET() {
  try {
    requirePhase2();
    const s = await requireAdminSession(true);
    return safeJson(await rpc("memocious_admin_proof", { sid: s.id }));
  } catch (e) {
    return failure(e);
  }
}
const proof = z.strictObject({
  caption: z.string().trim().min(1).max(500),
  firstName: z.string().trim().max(60),
  city: z.string().trim().max(120),
  consentReference: z.string().trim().min(1).max(500),
  active: z.boolean(),
  position: z.number().int().min(0).max(10000),
});
const counter = z.strictObject({
  label: z.string().trim().min(1).max(80),
  value: z.number().int().min(0).max(1000000000),
  evidenceReference: z.string().trim().min(1).max(500),
  active: z.boolean(),
});
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    const s = await requireAdminSession(true, true);
    const b = z
      .strictObject({
        entity: z.uuid().nullable(),
        expectedVersion: z.number().int().positive().nullable(),
        action: z.enum([
          "proof-save",
          "proof-delete",
          "counter-save",
          "catalogue-create",
          "catalogue-publish",
          "catalogue-hide",
        ]),
        fields: z.union([proof, counter, z.strictObject({})]),
      })
      .parse(await readBody(req));
    const fields =
      b.action === "proof-save"
        ? proof.parse(b.fields)
        : b.action === "counter-save"
          ? counter.parse(b.fields)
          : {};
    await rateLimit(req, "admin-settings", s.userId!);
    return safeJson(
      await rpc("memocious_admin_proof", {
        sid: s.id,
        entity: b.entity,
        expected_version: b.expectedVersion,
        action: b.action,
        fields,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
