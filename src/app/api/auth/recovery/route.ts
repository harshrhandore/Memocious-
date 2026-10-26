import type { NextRequest } from "next/server";
import { z } from "zod";
import { authReady } from "@/lib/config";
import { identityClient } from "@/lib/session";
import { guardMutation, readBody, rateLimit, safeJson, failure, HttpError } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    if (!authReady) throw new HttpError(503, "Password recovery is unavailable.");
    const body = z.strictObject({
      token: z.string().min(20).max(2048),
      password: z.string().min(12).max(200),
    }).parse(await readBody(req));
    await rateLimit(req, "auth");
    const client = identityClient();
    const verified = await client.auth.verifyOtp({ token_hash: body.token, type: "recovery" });
    if (verified.error || !verified.data.session)
      throw new HttpError(403, "This recovery link is invalid or expired. Request a new one.");
    try {
      const changed = await client.auth.updateUser({ password: body.password });
      if (changed.error) throw new HttpError(422, "The password could not be changed. Request a new link and use a different strong password.");
      return safeJson({ message: "Password changed. Sign in again with your new password and authenticator." });
    } finally {
      // Do not turn email recovery into an authenticated application/admin session.
      await client.auth.signOut({ scope: "global" });
    }
  } catch (error) {
    return failure(error);
  }
}
