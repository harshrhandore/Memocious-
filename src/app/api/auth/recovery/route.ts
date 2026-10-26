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
      code: z.string().regex(/^\d{6}$/).optional(),
    }).parse(await readBody(req));
    await rateLimit(req, "auth");
    const client = identityClient();
    const verified = await client.auth.verifyOtp({ token_hash: body.token, type: "recovery" });
    if (verified.error || !verified.data.session)
      throw new HttpError(403, "This recovery link is invalid or expired. Request a new one.");
    try {
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) throw new HttpError(503, "Authenticator details could not be checked. Request a new recovery link.");
      const factor = factors.data.totp[0];
      if (factor) {
        if (!body.code) throw new HttpError(422, "Enter your Google Authenticator code with a new recovery link.");
        const challenge = await client.auth.mfa.challenge({ factorId: factor.id });
        if (challenge.error) throw new HttpError(503, "Authenticator verification could not start. Request a new recovery link.");
        const checked = await client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code: body.code });
        if (checked.error) throw new HttpError(403, "Authenticator code was not accepted. Request a new recovery link and use a current code.");
      }
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
