import type { NextRequest } from "next/server";
import { enquirySchema } from "@/lib/domain";
import { writesReady, config } from "@/lib/config";
import { getPublicSettings } from "@/lib/catalogue";
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
import { buildWhatsApp, whatsappNumber, type Receipt } from "@/lib/whatsapp";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    if (!writesReady)
      throw new HttpError(
        503,
        "WhatsApp enquiries are temporarily unavailable.",
      );
    const parsed = enquirySchema.safeParse(await readBody(req));
    if (!parsed.success)
      throw new HttpError(
        422,
        "Please check the selected options and details.",
      );
    const b = parsed.data;
    let s: AppSession | null = null;
    try {
      s = await readSession();
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 401) throw e;
    }
    if (s?.audience === "admin")
      throw new HttpError(
        403,
        "You are signed in to Studio. Open this product in a private browser window to submit a customer enquiry, or sign out of Studio first.",
      );
    if (s) await bindSessionCsrf(s);
    const args = {
      request_key: b.idempotencyKey,
      product: b.productId,
      qty: b.quantity,
      selected: b.options,
      personal_message: b.message,
      budget_paise: b.budgetPaise,
      occasion: b.occasion,
      pincode: b.pincode,
    };
    const prior = s
      ? await rpc<Receipt | null>("memocious_enquiry_replay", {
          sid: s.id,
          ...args,
        })
      : null;
    const settings = await getPublicSettings();
    const number =
      settings.whatsappNumber && whatsappNumber(settings.whatsappNumber);
    if (prior) {
      if (!number)
        return safeJson({
          code: prior.code,
          url: null,
          message:
            "Your enquiry is saved. WhatsApp handoff is temporarily unavailable. Please retry later.",
          number: null,
        });
      return safeJson({
        code: prior.code,
        ...buildWhatsApp({ ...prior, number }, config.APP_ORIGIN),
      });
    }
    if (!number)
      throw new HttpError(
        503,
        "WhatsApp enquiries are temporarily unavailable.",
      );
    await protect(req, "enquiry", b.challenge, s?.id);
    const sid = s?.id ?? (await openSession(null, null, "guest", await csrf()));
    const receipt = await rpc<Receipt>("memocious_enquiry", { sid, ...args });
    return safeJson({
      code: receipt.code,
      ...buildWhatsApp({ ...receipt, number }, config.APP_ORIGIN),
    });
  } catch (e) {
    return failure(e);
  }
}
