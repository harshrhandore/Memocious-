import type { NextRequest } from "next/server";
import { productMutationSchema } from "@/lib/admin-domain";
import { requireAdminSession } from "@/lib/session";
import {
  guardMutation,
  rateLimit,
  readBody,
  failure,
  safeJson,
  HttpError,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
const schema = productMutationSchema;
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const b = schema.safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the product details.");
    const s = await requireAdminSession(
      ["delete", "purge"].includes(b.data.action),
      ["delete", "purge"].includes(b.data.action),
    );
    await rateLimit(req, "admin-product", s.id);
    return safeJson(
      await rpc("memocious_admin_product", {
        sid: s.id,
        product_id: b.data.productId,
        expected_version: b.data.version,
        action: b.data.action,
        fields: b.data.fields,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
