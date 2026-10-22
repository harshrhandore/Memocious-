import { isIP } from "node:net";
export function ingressIP(headers: Headers, provider: string | undefined) {
  const header =
    provider === "netlify"
      ? "x-nf-client-connection-ip"
      : provider === "vercel"
        ? "x-vercel-forwarded-for"
        : null;
  const value = header ? headers.get(header)?.trim() : null;
  return value && isIP(value) ? value : null;
}
