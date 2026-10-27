import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireBuilder } from "@/lib/builder-server";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    requireBuilder();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = z
      .strictObject({
        draft: z.uuid(),
        version: z.number().int().positive(),
        bytes: z.number().int().min(1).max(2097152),
        mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
      .parse(await readBody(req));
    await rateLimit(req, "admin-upload", s.userId!);
    return safeJson({
      id: await rpc("memocious_builder_file_begin", {
        sid: s.id,
        draft: b.draft,
        expected_version: b.version,
        bytes: b.bytes,
        declared_mime: b.mime,
      }),
    });
  } catch (e) {
    return failure(e);
  }
}
