"use client";
import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { money, type Product } from "@/lib/domain";
export function Enquiry({
  product,
  available,
  sitekey,
}: {
  product: Product;
  available: boolean;
  sitekey?: string;
}) {
  const messageLimit = product.messageLimit ?? 500;
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<{
    code: string;
    url: string | null;
    message: string;
    number: string | null;
  } | null>(null);
  const [key] = useState(() => globalThis.crypto?.randomUUID?.() ?? "");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!available) return;
    setPending(true);
    setStatus("");
    const form = new FormData(e.currentTarget);
    try {
      const csrf = await fetch("/api/session", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const r = await fetch("/api/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf.csrf,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: Number(form.get("quantity")),
          options: form.getAll("options").filter(Boolean),
          message,
          budgetPaise: form.get("budget")
            ? Math.round(Number(form.get("budget")) * 100)
            : null,
          occasion: String(form.get("occasion") ?? ""),
          pincode: String(form.get("pincode") ?? ""),
          consent: form.get("consent") === "on",
          idempotencyKey: key,
          challenge: String(form.get("cf-turnstile-response") ?? ""),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "Please try again shortly.");
      setReceipt(data);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again shortly.");
    } finally {
      (
        window as unknown as { turnstile?: { reset: () => void } }
      ).turnstile?.reset();
      setPending(false);
    }
  }
  return (
    <form className="enquiry-form" onSubmit={submit}>
      {!available && (
        <div className="notice mb-5">
          A little pause before we open. WhatsApp enquiries aren’t available
          yet. Explore the personalisation below; your details won’t be
          submitted.
        </div>
      )}
      {messageLimit > 0 && (
        <div className="form-field">
          <label htmlFor="personal-message">
            Your words, their smile{" "}
            <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="personal-message"
            name="message"
            value={message}
            onChange={(e) => {
              if ([...e.target.value].length <= messageLimit)
                setMessage(e.target.value);
            }}
            placeholder="A name, a little message, an inside joke…"
            rows={3}
          />
          <small>
            {[...message].length}/{messageLimit} characters · Illustrative
            preview
          </small>
        </div>
      )}
      {message && (
        <div className="notice mb-5">
          <span className="eyebrow">A LITTLE NOTE, FROM YOU</span>
          <p className="mt-2 font-serif italic">{message}</p>
        </div>
      )}
      {product.optionGroups?.length ? (
        product.optionGroups.map((group) => (
          <fieldset key={group.id} className="mb-4">
            <legend className="form-label">
              {group.label} {group.required ? "(required)" : "(optional)"} ·
              choose up to {group.maxCount}
            </legend>
            {group.maxCount === 1 ? (
              <select name="options" required={group.required} defaultValue="">
                <option value="">Choose {group.label.toLowerCase()}</option>
                {group.values.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}{" "}
                    {v.deltaPaise ? `(+${money(v.deltaPaise)})` : "· included"}
                  </option>
                ))}
              </select>
            ) : (
              group.values.map((v) => (
                <label className="check-label" key={v.id}>
                  <input type="checkbox" name="options" value={v.id} />
                  {v.label}{" "}
                  {v.deltaPaise ? `(+${money(v.deltaPaise)})` : "· included"}
                </label>
              ))
            )}
          </fieldset>
        ))
      ) : (
        <fieldset>
          <legend className="form-label">The finishing touch</legend>
          {product.options.map((o) => (
            <label className="check-label" key={o.id}>
              <input type="checkbox" name="options" value={o.id} />
              {o.label}{" "}
              {o.deltaPaise ? `(+${money(o.deltaPaise)})` : "· included"}
            </label>
          ))}
        </fieldset>
      )}
      <div className="form-row mt-4">
        <div className="form-field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={product.moq ?? 1}
            max="10000"
            defaultValue={product.moq ?? 1}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pincode">Pincode (optional)</label>
          <input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit pincode"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="enquiry-budget">Budget in ₹ (optional)</label>
          <input
            id="enquiry-budget"
            name="budget"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
          />
        </div>
        <div className="form-field">
          <label htmlFor="enquiry-occasion">Occasion (optional)</label>
          <input id="enquiry-occasion" name="occasion" maxLength={80} />
        </div>
      </div>
      {available && (
        <>
          <label className="check-label">
            <input name="consent" type="checkbox" required />
            <span>
              I’ve read the{" "}
              <Link href="/privacy" className="underline">
                privacy notice
              </Link>
              . My selected details will be included in WhatsApp when I
              continue.
            </span>
          </label>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile"
            data-sitekey={sitekey}
            data-action="enquiry"
          />
        </>
      )}
      {status && (
        <p role="alert" className="notice error my-4">
          {status}
        </p>
      )}
      {receipt ? (
        <div className="notice">
          <strong>Enquiry {receipt.code} created</strong>
          <p>
            Your enquiry is saved. Open WhatsApp and press Send to share it with
            the business.
          </p>
          {receipt.url && (
            <a
              className="button whatsapp my-3"
              href={receipt.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Continue on WhatsApp <MessageCircle size={17} />
            </a>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(receipt.message);
                setCopied(true);
              } catch {
                setStatus(
                  "Copy is unavailable in this browser. Select the summary text below.",
                );
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied" : "Copy message"}
          </button>
          {receipt.number && <p>Manual number: {receipt.number}</p>}
          <details>
            <summary>Full message</summary>
            <p>{receipt.message}</p>
          </details>
        </div>
      ) : (
        <button
          className="button whatsapp full"
          type="submit"
          disabled={!available || pending}
        >
          {pending
            ? "Saving your enquiry…"
            : available
              ? "Prepare WhatsApp enquiry"
              : "WhatsApp ordering opens soon"}
          <MessageCircle size={18} />
        </button>
      )}
      <p className="quiet-note">
        Estimate only. Final price, customisation and shipping confirmed with
        the business. You’ll press Send in WhatsApp.
      </p>
    </form>
  );
}
