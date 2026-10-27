"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import type { ProductSummary } from "@/app/[admin]/page";
import { AdminCustomRequests } from "./admin-custom";
import { AdminPhase2 } from "./admin-phase2";
import { AdminStudio } from "./admin-studio";
import { AdminWorkspace } from "./admin-workspace";
export function AdminPanel({
  available,
  stage,
  products: _products,
  sitekey,
  phase2 = false,
  phase3 = false,
  phase5 = false,
}: {
  available: boolean;
  stage: "primary" | "mfa" | "verified";
  products: ProductSummary[];
  sitekey: string;
  phase2?: boolean;
  phase3?: boolean;
  phase5?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<{ id: string; label: string }[]>([]);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    secret: string;
  } | null>(null);
  async function send(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setStatus("");
    try {
      const sessionResponse = await fetch("/api/session", {
        cache: "no-store",
      });
      const sessionRaw = await sessionResponse.text();
      let s: { csrf?: string; message?: string } = {};
      if (sessionRaw.trim()) {
        try {
          s = JSON.parse(sessionRaw) as typeof s;
        } catch {
          throw new Error(
            `Session service returned an invalid response (${sessionResponse.status}).`,
          );
        }
      }
      if (!sessionResponse.ok)
        throw new Error(
          s.message ?? `Session request failed (${sessionResponse.status}).`,
        );
      if (typeof s.csrf !== "string" || !s.csrf)
        throw new Error("Session service did not provide a security token.");
      const challenge =
        document.querySelector<HTMLInputElement>(
          '[name="cf-turnstile-response"]',
        )?.value ?? "";
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
        body: JSON.stringify({
          ...body,
          ...(path === "/api/admin/auth"
            ? {
                providerChallenge:
                  document.querySelector<HTMLInputElement>(
                    '[name="provider-challenge"]',
                  )?.value ?? "",
              }
            : {}),
          ...(path.includes("/auth") || path.includes("/mfa")
            ? { challenge }
            : {}),
        }),
      });
      const raw = await r.text();
      let d: { message?: string; [key: string]: unknown } = {};
      if (raw.trim()) {
        try {
          d = JSON.parse(raw) as typeof d;
        } catch {
          throw new Error(`Server returned an invalid response (${r.status}).`);
        }
      }
      if (!r.ok) throw new Error(d.message ?? `Request failed (${r.status}).`);
      return d;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
      return null;
    } finally {
      setBusy(false);
      const turnstile = (
        window as unknown as { turnstile?: { reset: () => void } }
      ).turnstile;
      turnstile?.reset();
    }
  }
  if (!available)
    return (
      <div className="notice">
        Administration is unavailable until provider credentials, verification
        protections and the operator-provisioned owner account are configured.
        No default account or local sign-in bypass exists.
      </div>
    );
  return (
    <>
      <p className="notice">
        Staging implementation. Managed identity, TOTP recovery and the complete
        owner workflow still require end-to-end verification before release.
      </p>
      {stage === "primary" ? (
        <form
          className="mt-6 max-w-lg"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await send("/api/admin/auth", {
                email: f.get("email"),
                password: f.get("password"),
              })
            )
              router.refresh();
          }}
        >
          <div className="form-field">
            <label htmlFor="admin-email">Owner email</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </div>
          <button type="submit" className="button" disabled={busy}>
            Continue to verification
          </button>
        </form>
      ) : stage === "mfa" ? (
        <section className="mt-6 max-w-lg">
          <h2>Verify your authenticator.</h2>
          <p>Primary sign-in does not grant access to business data.</p>
          <button
            type="button"
            className="button secondary mr-3"
            disabled={busy}
            onClick={async () => {
              const d = await send("/api/admin/mfa", { action: "list" });
              if (d && Array.isArray(d.factors)) {
                setFactors(
                  d.factors.filter(
                    (factor): factor is { id: string; label: string } =>
                      typeof factor?.id === "string" &&
                      typeof factor?.label === "string",
                  ),
                );
              }
            }}
          >
            Find my authenticator
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              const d = await send("/api/admin/mfa", { action: "enroll" });
              if (
                d &&
                typeof d.factorId === "string" &&
                typeof d.secret === "string"
              ) {
                setEnrollment({ factorId: d.factorId, secret: d.secret });
              }
            }}
          >
            Add an authenticator
          </button>
          {enrollment && (
            <div className="notice my-5">
              <p>
                Add a time-based account in your authenticator using this
                secret. It is shown only in this page’s memory; store your
                backup factor according to the operator procedure.
              </p>
              <code className="break-all select-all">{enrollment.secret}</code>
            </div>
          )}
          <form
            className="mt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await send("/api/admin/mfa", {
                  action: "verify",
                  factorId: f.get("factorId"),
                  code: f.get("code"),
                })
              ) {
                setEnrollment(null);
                router.refresh();
              }
            }}
          >
            <div className="form-field">
              <label htmlFor="factor">Authenticator</label>
              <select id="factor" name="factorId" required>
                {enrollment && (
                  <option value={enrollment.factorId}>New authenticator</option>
                )}
                {factors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="totp">Six-digit code</label>
              <input
                id="totp"
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="button" disabled={busy}>
              Verify &amp; continue
            </button>
          </form>
          <p>
            Lost your device? Contact the verified operator using the documented
            recovery procedure. There is no email-only factor reset.
          </p>
        </section>
      ) : phase5 ? (
        <AdminStudio
          phase2={phase2}
          phase3={phase3}
          security={
            <AdminPanel
              available={available}
              stage="mfa"
              products={[]}
              sitekey={sitekey}
            />
          }
        />
      ) : (
        <>
          <AdminWorkspace />
          {phase2 && <AdminPhase2 />}
          {phase3 && <AdminCustomRequests />}
          <details className="my-8">
            <summary>Authenticator verification and backup factor</summary>
            <AdminPanel
              available={available}
              stage="mfa"
              products={[]}
              sitekey={sitekey}
            />
          </details>
        </>
      )}
      {stage !== "verified" && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile mt-5"
            data-sitekey={sitekey}
            data-action="auth"
          />
          {stage === "primary" && (
            <div
              className="cf-turnstile"
              data-sitekey={sitekey}
              data-action="provider-auth"
              data-response-field-name="provider-challenge"
            />
          )}
        </>
      )}
      {status && (
        <p className="notice error mt-5" role="alert">
          {status}
        </p>
      )}
    </>
  );
}
