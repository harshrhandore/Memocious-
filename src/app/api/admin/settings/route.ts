import type { NextRequest } from "next/server";
import { settingsSchema } from "@/lib/admin-domain";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { whatsappNumber } from "@/lib/whatsapp";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await requireAdminSession(true, true);
    const b = settingsSchema.safeParse(await readBody(req));
    if (
      !b.success ||
      (b.data.whatsappNumber !== null && !whatsappNumber(b.data.whatsappNumber))
    )
      throw new HttpError(
        422,
        "Check the contact settings, including international phone digits.",
      );
    await rateLimit(req, "admin-settings", s.id);
    await rpc("memocious_admin_settings", { sid: s.id, fields: b.data });
    return safeJson({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
