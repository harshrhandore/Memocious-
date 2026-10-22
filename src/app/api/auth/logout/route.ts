import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  guardMutation,
  readBody,
  cookieName,
  safeJson,
  failure,
} from "@/lib/security";
import {
  readSession,
  currentTokens,
  bindSessionCsrf,
  requireAdminSession,
} from "@/lib/session";
import { rpc, serverDb } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const { everywhere } = z
      .strictObject({ everywhere: z.boolean() })
      .parse(await readBody(req));
    const s = await readSession();
    await bindSessionCsrf(s);
    if (everywhere && s.audience === "admin")
      await requireAdminSession(true, true);
    const tokens = s.encryptedTokens ? await currentTokens(s) : null;
    await rpc("memocious_session_revoke", { sid: s.id, everywhere });
    if (tokens)
      await serverDb().auth.admin.signOut(
        tokens.accessToken,
        everywhere ? "global" : "local",
      );
    const jar = await cookies();
    jar.delete(cookieName);
    jar.delete(cookieName + ".csrf");
    return safeJson({ signedOut: true });
  } catch (e) {
    return failure(e);
  }
}
