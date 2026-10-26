import type { NextRequest } from "next/server";
import { z } from "zod";
import { phase3Ready } from "@/lib/config";
import { draftMutation } from "@/lib/builder-domain";
import { requireCustomerSession, bindSessionCsrf } from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc } from "@/lib/server-db";
export const dynamic = "force-dynamic";
function enabled() {
  if (!phase3Ready)
    throw new HttpError(
      503,
      "Saved builder drafts are being set up. Your edits are not saved.",
    );
}
export async function GET(req: NextRequest) {
  try {
    enabled();
    const s = await requireCustomerSession();
    const id = req.nextUrl.searchParams.get("id");
    if (id) z.uuid().parse(id);
    return safeJson(
      await rpc("memocious_builder_draft", {
        sid: s.id,
        action: id ? "read" : "list",
        draft_id: id,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    enabled();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const b = draftMutation.parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    return safeJson(
      await rpc("memocious_builder_draft", {
        sid: s.id,
        action: b.action,
        draft_id: b.id,
        expected_version: b.expectedVersion,
        ...(b.action === "delete"
          ? {}
          : {
              draft_schema: b.schemaVersion,
              step_num: b.step,
              fields: b.payload,
            }),
      }),
    );
  } catch (e) {
    if (e instanceof HttpError && e.status === 403)
      return failure(
        new HttpError(403, "This draft is unavailable for your account."),
      );
    return failure(e);
  }
}
