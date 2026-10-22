import type { NextRequest } from "next/server";
import { z } from "zod";
import { authReady, config } from "@/lib/config";
import {
  guardMutation,
  readBody,
  protect,
  randomToken,
  cookieName,
  cookieOptions,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { identityClient, encrypt } from "@/lib/session";
import { safeReturnPath } from "@/lib/domain";
import { cookies } from "next/headers";
const schema = z.strictObject({
  consent: z.literal(true),
  method: z.enum(["google", "email"]),
  email: z.email().max(254).optional(),
  next: z.string().max(1000).optional(),
  challenge: z.string().min(1).max(2048),
  providerChallenge: z.string().min(1).max(2048).optional(),
});
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    if (!authReady)
      throw new HttpError(503, "Sign-in is temporarily unavailable.");
    const parsed = schema.safeParse(await readBody(req));
    if (!parsed.success) throw new HttpError(422, "Check the sign-in details.");
    const b = parsed.data;
    await protect(req, "auth", b.challenge, b.email?.trim().toLowerCase());
    const values: Record<string, string> = {};
    const client = identityClient({
      getItem: (k) => values[k] ?? null,
      setItem: (k, v) => {
        values[k] = v;
      },
      removeItem: (k) => {
        delete values[k];
      },
    });
    const state = randomToken();
    const returnPath = safeReturnPath(b.next);
    const redirectTo =
      config.APP_ORIGIN + "/auth/callback?state=" + encodeURIComponent(state);
    let url: string | undefined;
    if (b.method === "google") {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error)
        throw new HttpError(503, "Sign-in is temporarily unavailable.");
      url = data.url;
    } else {
      if (!b.email) throw new HttpError(422, "Enter a valid email.");
      if (!b.providerChallenge || b.providerChallenge === b.challenge)
        throw new HttpError(422, "Complete both sign-in verifications.");
      await client.auth.signInWithOtp({
        email: b.email,
        options: {
          emailRedirectTo: redirectTo,
          captchaToken: b.providerChallenge,
        },
      });
    }
    const verifier = Object.fromEntries(
      Object.entries(values).filter(([k]) => k.endsWith("-code-verifier")),
    );
    (await cookies()).set(
      cookieName + ".pkce",
      await encrypt({
        consent: true,
        values: verifier,
        state,
        next: returnPath,
        expiresAt: Date.now() + 10 * 60e3,
      }),
      { ...cookieOptions, maxAge: 600 },
    );
    return safeJson(
      url
        ? { url }
        : {
            message:
              "If sign-in is available for this address, a link will arrive shortly.",
          },
    );
  } catch (e) {
    return failure(e);
  }
}
