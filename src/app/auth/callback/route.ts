import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authReady, config } from "@/lib/config";
import { cookieName, csrf, equal } from "@/lib/security";
import { identityClient, decrypt, openSession } from "@/lib/session";
import { safeReturnPath } from "@/lib/domain";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get(cookieName + ".pkce")?.value;
  jar.delete(cookieName + ".pkce");
  let target = "/login?error=expired";
  try {
    if (!authReady || !raw) throw new Error();
    const saved = await decrypt<{
      consent: boolean;
      values: Record<string, string>;
      state: string;
      next: string;
      expiresAt: number;
    }>(raw);
    const state = req.nextUrl.searchParams.get("state");
    const code = req.nextUrl.searchParams.get("code");
    if (
      saved.consent !== true ||
      !state ||
      !equal(state, saved.state) ||
      !code ||
      saved.expiresAt < Date.now()
    )
      throw new Error();
    const client = identityClient({
      getItem: (k) => saved.values[k] ?? null,
      setItem: () => {},
      removeItem: () => {},
    });
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw new Error();
    const verified = await client.auth.getUser(data.session.access_token);
    if (
      verified.error ||
      !verified.data.user?.email_confirmed_at ||
      verified.data.user.is_anonymous
    )
      throw new Error();
    await openSession(
      verified.data.user.id,
      {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at!,
      },
      "customer",
      await csrf(),
    );
    target = safeReturnPath(saved.next);
  } catch {
    /* Generic recovery; no provider message or PII in URL. */
  }
  const res = NextResponse.redirect(new URL(target, config.APP_ORIGIN));
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
