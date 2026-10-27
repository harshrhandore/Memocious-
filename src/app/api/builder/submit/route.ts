import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireBuilder } from "@/lib/builder-server";
import { config } from "@/lib/config";
import { getPublicSettings } from "@/lib/catalogue";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  protect,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
import { customHandoff, type CustomReceipt } from "@/lib/custom-request";
const schema = z
  .object({
    draft: z.uuid(),
    version: z.number().int().positive(),
    requestKey: z.uuid(),
    consent: z.literal(true),
    acceptEstimate: z.literal(true),
    challenge: z.string().max(4096),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requireBuilder();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = schema.parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    const args = {
      sid: s.id,
      draft: b.draft,
      expected_version: b.version,
      request_key: b.requestKey,
      consent: b.consent,
      accept_estimate: b.acceptEstimate,
    };
    let receipt = await rpc<CustomReceipt | null>("memocious_builder_submit", {
      ...args,
      replay_only: true,
    });
    if (!receipt) {
      await protect(req, "enquiry", b.challenge, s.userId!);
      receipt = await rpc<CustomReceipt>("memocious_builder_submit", args);
    }
    const settings = await getPublicSettings();
    return safeJson(
      customHandoff(
        receipt,
        settings.whatsappNumber ?? null,
        config.APP_ORIGIN,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
