"use client";
import { useState } from "react";
import { Heart, Mail, ArrowRight } from "lucide-react";
import Script from "next/script";
import Link from "next/link";
export function LoginForm({
  available,
  next,
  sitekey,
}: {
  available: boolean;
  next: string;
  sitekey: string;
}) {
  const [status, setStatus] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function start(method: "google" | "email", email?: string) {
    setBusy(true);
    setStatus("");
    try {
      const token =
        document.querySelector<HTMLInputElement>(
          '[name="cf-turnstile-response"]',
        )?.value ?? "";
      const session = await fetch("/api/session", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const r = await fetch("/api/auth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: JSON.stringify({
          method,
          ...(email ? { email } : {}),
          next,
          challenge: token,
          consent: true,
          ...(method === "email"
            ? {
                providerChallenge:
                  document.querySelector<HTMLInputElement>(
                    '[name="provider-challenge"]',
                  )?.value ?? "",
              }
            : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      if (data.url) location.assign(data.url);
      else setStatus(data.message);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again shortly.");
    } finally {
      setBusy(false);
      (
        window as unknown as { turnstile?: { reset: () => void } }
      ).turnstile?.reset();
    }
  }
  return (
    <>
      <Heart className="mx-auto" size={30} strokeWidth={1} />
      <h1>Your little corner.</h1>
      <p>
        A private place for your profile and account settings. You can explore
        gifts without signing in.
      </p>
      {!available && (
        <div className="notice">
          Sign-in is temporarily unavailable while we finish setting up. You can
          still explore the collection without an account.
        </div>
      )}
      <label className="check-label my-5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={!available}
        />
        <span>
          I have read the{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>{" "}
          and agree to using my identity for this account and sign-in security.
        </span>
      </label>
      <button
        type="button"
        className="button full secondary mt-7"
        disabled={!available || busy || !agreed}
        onClick={() => start("google")}
      >
        <span className="font-semibold text-base">G</span> Continue with Google{" "}
        <ArrowRight size={17} />
      </button>
      <p className="mt-5">or use a sign-in link</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void start("email", String(data.get("email")));
        }}
      >
        <div className="form-field">
          <label htmlFor="email">Your email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            required
            disabled={!available || busy || !agreed}
          />
        </div>
        {available && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
            />
            <div
              className="cf-turnstile"
              data-sitekey={sitekey}
              data-action="auth"
            />
            <div
              className="cf-turnstile"
              data-sitekey={sitekey}
              data-action="provider-auth"
              data-response-field-name="provider-challenge"
            />
          </>
        )}
        <button
          type="submit"
          className="button full"
          disabled={!available || busy || !agreed}
        >
          {busy ? "A little moment…" : "Send a sign-in link"}
          <Mail size={16} />
        </button>
      </form>
      {status && (
        <p className="notice mt-5" role="status">
          {status}
        </p>
      )}
      <p className="quiet-note">
        No account is needed to browse. Sign-in enables private account features
        as they become available.
      </p>
    </>
  );
}
