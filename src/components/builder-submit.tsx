"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import type { BuilderDraft } from "@/lib/builder-domain";
import type { CustomContinuation } from "@/lib/custom-request";
import { privateRequest } from "@/lib/client-request";
type ChallengeApi = {
  ready: (callback: () => void) => void;
  render: (
    container: HTMLElement,
    options: { sitekey: string; action: string },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
function challengeApi() {
  return (window as unknown as { turnstile?: ChallengeApi }).turnstile;
}
export function BuilderSubmit({
  draft,
  eligible,
  sitekey,
  onSubmitted,
  onBusy,
}: {
  draft: BuilderDraft;
  eligible: boolean;
  sitekey: string;
  onSubmitted: (r: CustomContinuation) => void;
  onBusy: (busy: boolean) => void;
}) {
  const key = useRef<string | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const container = useRef<HTMLDivElement>(null),
    widget = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (widget.current !== null) {
        challengeApi()?.remove(widget.current);
        widget.current = null;
      }
    },
    [],
  );
  function renderChallenge() {
    const api = challengeApi();
    api?.ready(() => {
      if (container.current && widget.current === null)
        widget.current = api.render(container.current, {
          sitekey,
          action: "enquiry",
        });
    });
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!eligible || busy) return;
        const data = new FormData(e.currentTarget);
        setBusy(true);
        onBusy(true);
        setStatus("Saving your request...");
        try {
          key.current ??= crypto.randomUUID();
          const r = await privateRequest<CustomContinuation>(
            "/api/builder/submit",
            {
              draft: draft.id,
              version: draft.version,
              requestKey: key.current,
              consent: data.get("consent") === "on",
              acceptEstimate: data.get("estimate") === "on",
              challenge: String(data.get("cf-turnstile-response") ?? ""),
            },
          );
          onSubmitted(r);
        } catch (e) {
          if (widget.current !== null) challengeApi()?.reset(widget.current);
          setStatus(
            `${e instanceof Error ? e.message : "Response unavailable."} If the response was interrupted, your request may already be saved. Retry here or check your account; do not create another draft.`,
          );
        } finally {
          setBusy(false);
          onBusy(false);
        }
      }}
    >
      <label className="check-label">
        <input type="checkbox" name="consent" required disabled={busy} />I have
        read the{" "}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>{" "}
        and agree to the owner using these details and private images to discuss
        my custom gift.
      </label>
      <label className="check-label">
        <input type="checkbox" name="estimate" required disabled={busy} />I have
        reviewed my saved plan. Estimates are provisional; final price, shipping
        and delivery require owner confirmation.
      </label>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={renderChallenge}
        onError={() =>
          setStatus(
            "Verification could not load. Check your connection and reload this saved draft.",
          )
        }
      />
      <div ref={container} />
      {!eligible && (
        <p>Save your current review and finish uploads before submitting.</p>
      )}
      <button className="button" type="submit" disabled={!eligible || busy}>
        {busy ? "Saving request..." : "Submit quote request"}
      </button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}
