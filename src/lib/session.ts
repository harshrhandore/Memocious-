import "server-only";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { sealSession, unsealSession, type Keyring } from "./session-crypto";
import { createClient } from "@supabase/supabase-js";
import { authReady } from "./config";
import { rpc } from "./server-db";
import {
  cookieName,
  cookieOptions,
  hash,
  randomToken,
  HttpError,
  equal,
} from "./security";
export type ProviderTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
export type AppSession = {
  id: string;
  userId: string | null;
  audience: "customer" | "guest" | "admin";
  assurance: "aal1" | "aal2";
  mfaAt: string | null;
  encryptedTokens: string | null;
  csrfHash: string;
  credentialVersion: number;
};
function keyring(): Keyring {
  if (!process.env.SESSION_ENCRYPTION_KEY)
    throw new HttpError(503, "Sign-in is temporarily unavailable.");
  let previous: Record<string, string> = {};
  try {
    previous = JSON.parse(process.env.SESSION_PREVIOUS_KEYS || "{}");
  } catch {
    throw new HttpError(503, "Sign-in is temporarily unavailable.");
  }
  return {
    version: process.env.SESSION_KEY_VERSION ?? "1",
    current: process.env.SESSION_ENCRYPTION_KEY,
    previous,
  };
}
export async function encrypt(value: Record<string, unknown>) {
  return sealSession(value, keyring());
}
export async function decrypt<T>(value: string): Promise<T> {
  const keys = keyring();
  try {
    return await unsealSession<T>(value, keys);
  } catch {
    throw new HttpError(401, "Please sign in again.");
  }
}
export function identityClient(storage?: {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
}) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)])
              : AbortSignal.timeout(10000),
          }),
      },
      auth: {
        persistSession: !!storage,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
        storage,
      },
    },
  );
}
export async function openSession(
  userId: string | null,
  tokens: ProviderTokens | null,
  audience: AppSession["audience"],
  csrfValue: string,
) {
  const jar = await cookies();
  const opaque =
    audience === "guest"
      ? (jar.get(cookieName)?.value ?? randomToken())
      : randomToken();
  const id = await rpc<string>("memocious_session_open", {
    cookie_hash: hash(opaque),
    csrf_hash: hash(csrfValue),
    provider_user: userId,
    audience,
    encrypted_tokens: tokens ? await encrypt(tokens) : null,
    key_version: process.env.SESSION_KEY_VERSION ?? "1",
  });
  (await cookies()).set(cookieName, opaque, {
    ...cookieOptions,
    maxAge: audience === "admin" ? 8 * 3600 : 7 * 86400,
  });
  return id;
}
export async function readSession(intentional = false): Promise<AppSession> {
  if (!authReady)
    throw new HttpError(503, "Sign-in is temporarily unavailable.");
  const opaque = (await cookies()).get(cookieName)?.value;
  if (!opaque) throw new HttpError(401, "Please sign in to continue.");
  const s = await rpc<AppSession | null>("memocious_session_read", {
    cookie_hash: hash(opaque),
    intentional,
  });
  if (!s) throw new HttpError(401, "Please sign in again.");
  if (s.audience === "guest") return s;
  const tokens = await currentTokens(s);
  const { data, error } = await identityClient().auth.getUser(
    tokens.accessToken,
  );
  if (
    error ||
    !data.user ||
    data.user.id !== s.userId ||
    data.user.is_anonymous ||
    !data.user.email_confirmed_at
  )
    throw new HttpError(401, "Please sign in again.");
  if (s.audience === "admin" && s.assurance === "aal2") {
    const claims = decodeJwt(tokens.accessToken);
    if (
      claims.aal !== "aal2" ||
      !data.user.factors?.some(
        (f) => f.factor_type === "totp" && f.status === "verified",
      )
    ) {
      await rpc("memocious_session_revoke", { sid: s.id, everywhere: false });
      throw new HttpError(
        401,
        "Please sign in and verify your authenticator again.",
      );
    }
  }
  return s;
}
export async function currentTokens(s: AppSession): Promise<ProviderTokens> {
  if (!s.encryptedTokens) throw new HttpError(401, "Please sign in again.");
  let tokens = await decrypt<ProviderTokens>(s.encryptedTokens);
  if (tokens.expiresAt * 1000 > Date.now() + 60000) return tokens;
  const lease = crypto.randomUUID();
  const claimed = await rpc<boolean>("memocious_refresh_claim", {
    sid: s.id,
    lease,
  });
  if (!claimed)
    throw new HttpError(409, "Your session is updating. Please try again.");
  try {
    const client = identityClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: tokens.refreshToken,
    });
    if (error || !data.session) throw new Error("Refresh unavailable");
    tokens = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at!,
    };
    const encrypted = await encrypt(tokens);
    await rpc("memocious_refresh_commit", {
      sid: s.id,
      lease,
      tokens: encrypted,
    });
    s.encryptedTokens = encrypted;
    return tokens;
  } catch {
    await rpc("memocious_session_revoke", { sid: s.id, everywhere: false });
    throw new HttpError(401, "Please sign in again.");
  }
}
export async function bindSessionCsrf(s: AppSession) {
  const value = (await cookies()).get(cookieName + ".csrf")?.value;
  if (!value || !equal(hash(value), s.csrfHash))
    throw new HttpError(403, "Refresh this page and try again.");
}
export async function requireCustomerSession() {
  const s = await readSession();
  if (s.audience !== "customer")
    throw new HttpError(403, "Please sign in to your customer account.");
  return s;
}
export async function requireAdminSession(ownerOnly = false, recent = false) {
  const s = await readSession(true);
  if (s.audience !== "admin" || s.assurance !== "aal2")
    throw new HttpError(403, "Administrator verification required.");
  await bindSessionCsrf(s);
  await rpc("memocious_admin_assert", {
    sid: s.id,
    owner_only: ownerOnly,
    recent,
  });
  return s;
}
