import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = z
      .strictObject({ fullName: z.string().trim().max(120) })
      .safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check your name and try again.");
    await rateLimit(req, "profile", s.userId!);
    return safeJson(
      await rpc("memocious_profile", { sid: s.id, new_name: b.data.fullName }),
    );
  } catch (e) {
    return failure(e);
  }
}
