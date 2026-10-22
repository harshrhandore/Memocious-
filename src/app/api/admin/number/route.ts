import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  protect,
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
    const b = z
      .strictObject({
        number: z.string().max(15).nullable(),
        challenge: z.string().min(1).max(2048),
      })
      .safeParse(await readBody(req));
    if (!b.success)
      throw new HttpError(422, "Enter international digits only.");
    const number =
      b.data.number === null ? null : whatsappNumber(b.data.number);
    if (b.data.number !== null && !number)
      throw new HttpError(
        422,
        "Enter a valid country code and number, without spaces or a plus sign.",
      );
    await protect(req, "auth", b.data.challenge, s.id);
    await rpc("memocious_admin_number", { sid: s.id, number_digits: number });
    return safeJson({ configured: !!number });
  } catch (e) {
    return failure(e);
  }
}
