import type { NextRequest } from "next/server";
import { taxonomySchema } from "@/lib/admin-domain";
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
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await requireAdminSession();
    const b = taxonomySchema.safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the taxonomy details.");
    await rateLimit(req, "admin-taxonomy", s.id);
    const { kind, id, version, ...fields } = b.data;
    await rpc("memocious_admin_taxonomy", {
      sid: s.id,
      kind,
      item_id: id,
      expected_version: version,
      fields,
    });
    return safeJson({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
