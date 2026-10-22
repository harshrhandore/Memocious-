import type { NextRequest } from "next/server";
import { z } from "zod";
import { authReady } from "@/lib/config";
import {
  guardMutation,
  readBody,
  protect,
  csrf,
  failure,
  safeJson,
  HttpError,
} from "@/lib/security";
import { identityClient, openSession } from "@/lib/session";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    if (!authReady || !process.env.ADMIN_ROUTE)
      throw new HttpError(503, "Administrator sign-in is unavailable.");
    const b = z
      .strictObject({
        email: z.email().max(254),
        password: z.string().min(1).max(200),
        challenge: z.string().min(1).max(2048),
        providerChallenge: z.string().min(1).max(2048),
      })
      .safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check your sign-in details.");
    await protect(
      req,
      "auth",
      b.data.challenge,
      b.data.email.trim().toLowerCase(),
    );
    if (b.data.challenge === b.data.providerChallenge)
      throw new HttpError(422, "Complete both sign-in verifications.");
    const client = identityClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: b.data.email,
      password: b.data.password,
      options: { captchaToken: b.data.providerChallenge },
    });
    if (error || !data.session || !data.user.email_confirmed_at)
      throw new HttpError(403, "Sign-in could not be completed.");
    await openSession(
      data.user.id,
      {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at!,
      },
      "admin",
      await csrf(),
    );
    return safeJson({ verificationRequired: true });
  } catch (e) {
    return failure(e);
  }
}
