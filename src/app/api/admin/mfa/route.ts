import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { canEnrollInitialFactor } from "@/lib/session-policy";
import {
  guardMutation,
  readBody,
  protect,
  failure,
  safeJson,
  HttpError,
  randomToken,
  hash,
  cookieName,
  cookieOptions,
} from "@/lib/security";
import {
  readSession,
  bindSessionCsrf,
  currentTokens,
  identityClient,
  encrypt,
} from "@/lib/session";
import { rpc } from "@/lib/server-db";
export async function POST(req: NextRequest) {
  try {
    await guardMutation(req);
    const s = await readSession(true);
    await bindSessionCsrf(s);
    if (s.audience !== "admin")
      throw new HttpError(403, "Administrator sign-in required.");
    const b = z
      .strictObject({
        action: z.enum(["list", "enroll", "verify"]),
        factorId: z.uuid().optional(),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
        challenge: z.string().min(1).max(2048),
      })
      .safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the verification details.");
    await protect(req, "auth", b.data.challenge, s.userId!);
    const tokens = await currentTokens(s);
    const client = identityClient();
    const loaded = await client.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (loaded.error) throw new HttpError(401, "Please sign in again.");
    if (b.data.action === "list") {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw new HttpError(503, "Verification is unavailable.");
      return safeJson({
        factors: data.totp.map((f) => ({
          id: f.id,
          label: f.friendly_name ?? "Authenticator",
          status: f.status,
        })),
      });
    }
    if (b.data.action === "enroll") {
      const factors = await client.auth.mfa.listFactors();
      if (factors.error)
        throw new HttpError(
          503,
          "Authenticator setup is temporarily unavailable.",
        );
      const freshOwner =
        s.assurance === "aal2" &&
        !!s.mfaAt &&
        Date.parse(s.mfaAt) > Date.now() - 300000;
      if (freshOwner)
        await rpc("memocious_admin_assert", {
          sid: s.id,
          owner_only: true,
          recent: true,
        });
      if (!freshOwner && !canEnrollInitialFactor(s.assurance, factors.data.all))
        throw new HttpError(
          403,
          "Use the audited operator procedure for factor changes.",
        );
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Memocious owner",
      });
      if (error)
        throw new HttpError(503, "Authenticator setup could not be completed.");
      return safeJson({
        factorId: data.id,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    }
    if (!b.data.factorId || !b.data.code)
      throw new HttpError(422, "Enter the authenticator code.");
    const verification = await client.auth.mfa.challengeAndVerify({
      factorId: b.data.factorId,
      code: b.data.code,
    });
    if (verification.error)
      throw new HttpError(403, "Verification could not be completed.");
    const {
      data: { session },
    } = await client.auth.getSession();
    const { data: assurance, error: assuranceError } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!session || assuranceError || assurance.currentLevel !== "aal2")
      throw new HttpError(403, "Verification could not be completed.");
    const verified = await client.auth.getUser(session.access_token);
    if (verified.error || verified.data.user.id !== s.userId)
      throw new HttpError(403, "Verification could not be completed.");
    const opaque = randomToken(),
      csrfValue = randomToken();
    await rpc("memocious_session_mfa", {
      sid: s.id,
      new_cookie_hash: hash(opaque),
      new_csrf_hash: hash(csrfValue),
      new_encrypted_tokens: await encrypt({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at!,
      }),
    });
    const jar = await cookies();
    jar.set(cookieName, opaque, { ...cookieOptions, maxAge: 8 * 3600 });
    jar.set(cookieName + ".csrf", csrfValue, {
      ...cookieOptions,
      maxAge: 3600,
    });
    return safeJson({ verified: true });
  } catch (e) {
    return failure(e);
  }
}
