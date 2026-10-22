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
  productId: z.uuid(),
  bytes: z.number().int().min(1).max(2097152),
  alt: z.string().trim().min(1).max(300),
});
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await requireAdminSession();
    const b = schema.safeParse(await readBody(req));
    if (!b.success)
      throw new HttpError(
        422,
        "Choose a still JPEG, PNG or WebP no larger than 2 MiB, and describe it.",
      );
    await rateLimit(req, "admin-upload", s.userId!);
    const id = await rpc<string>("memocious_media_begin", {
      sid: s.id,
      product: b.data.productId,
      bytes: b.data.bytes,
      alt_text: b.data.alt,
    });
    return safeJson({ id });
  } catch (e) {
    return failure(e);
  }
}
