import {
  csrf,
  safeJson,
  cookieName,
  cookieOptions,
  randomToken,
} from "@/lib/security";
import { cookies } from "next/headers";
import { authReady } from "@/lib/config";
import { readSession } from "@/lib/session";
export const dynamic = "force-dynamic";
export async function GET() {
  const token = await csrf();
  if (authReady) {
    const jar = await cookies();
    if (!jar.get(cookieName))
      jar.set(cookieName, randomToken(), {
        ...cookieOptions,
        maxAge: 7 * 86400,
      });
  }
  if (!authReady)
    return safeJson({ signedIn: false, available: false, csrf: token });
  try {
    const s = await readSession();
    return safeJson({
      signedIn: s.audience === "customer",
      available: true,
      csrf: token,
    });
  } catch {
    return safeJson({ signedIn: false, available: true, csrf: token });
  }
}
