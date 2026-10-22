import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
const schema = z.strictObject({
  ids: z.array(z.uuid()).min(1).max(100).nullable(),
  mode: z.enum(["soft", "permanent"]),
  digest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  confirmation: z.string().max(40).nullable(),
});
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await requireAdminSession(true, true);
    const b = schema.safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the deletion selection.");
    await rateLimit(req, "admin-delete", s.id);
    return safeJson(
      await rpc("memocious_admin_delete", {
        sid: s.id,
        scope_ids: b.data.ids,
        mode: b.data.mode,
        expected_digest: b.data.digest,
        confirmation: b.data.confirmation,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
