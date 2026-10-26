import type { NextRequest } from "next/server";
import { z } from "zod";
import { contactFields, enterpriseFields } from "@/lib/phase2-domain";
import { requirePhase2 } from "@/lib/phase2";
import { writesReady } from "@/lib/config";
import {
  guardMutation,
  readBody,
  protect,
  safeJson,
  failure,
  HttpError,
  csrf,
} from "@/lib/security";
import {
  readSession,
  openSession,
  bindSessionCsrf,
  type AppSession,
} from "@/lib/session";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requirePhase2();
    if (!writesReady)
      throw new HttpError(503, "Enquiries are temporarily unavailable.");
    const b = z
      .discriminatedUnion("kind", [
        z.strictObject({
          kind: z.literal("contact"),
          fields: contactFields,
          idempotencyKey: z.uuid(),
          challenge: z.string().max(4096),
        }),
        z.strictObject({
          kind: z.literal("enterprise"),
          fields: enterpriseFields,
          idempotencyKey: z.uuid(),
          challenge: z.string().max(4096),
        }),
      ])
      .parse(await readBody(req));
    let s: AppSession | null = null;
    try {
      s = await readSession();
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 401) throw e;
    }
    if (s?.audience === "admin")
      throw new HttpError(
        403,
        "Open a private browser window to send a customer enquiry.",
      );
    if (s) await bindSessionCsrf(s);
    await protect(req, "enquiry", b.challenge, s?.id);
    const sid = s?.id ?? (await openSession(null, null, "guest", await csrf()));
    const receipt = await rpc<{
      id: string;
      code: string;
      number: string | null;
      message: string;
      notification: string;
    }>("memocious_inquiry", {
      sid,
      request_key: b.idempotencyKey,
      kind: b.kind,
      fields: b.fields,
    });
    return safeJson({
      ...receipt,
      url:
        b.kind === "enterprise" &&
        receipt.number &&
        /^[1-9][0-9]{6,14}$/.test(receipt.number)
          ? `https://wa.me/${receipt.number}?text=${encodeURIComponent(receipt.message)}`
          : null,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function GET(){try{requirePhase2();const {requireCustomerSession}=await import("@/lib/session");const s=await requireCustomerSession();return safeJson(await rpc("memocious_my_enterprise",{sid:s.id}));}catch(e){return failure(e);}}
