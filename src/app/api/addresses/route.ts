import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { requirePhase2 } from "@/lib/phase2";
export const dynamic = "force-dynamic";
import { addressSchema } from "@/lib/phase2-domain";
export async function GET() {
  try {
    requirePhase2();
    const s = await requireCustomerSession();
    return safeJson(await rpc("memocious_addresses", { sid: s.id }));
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
    const b = addressSchema.parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    return safeJson(
      await rpc("memocious_addresses", {
        sid: s.id,
        action: b.action,
        address_id: b.id,
        expected_version: b.expectedVersion,
        fields: b.action === "save" ? b.fields : {},
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
