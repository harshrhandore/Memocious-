"use client";
import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { privateRequest } from "@/lib/client-request";
import { PhotoUpload } from "./reviews";
export type EnterpriseChoice = {
  id: string;
  name: string;
  moq: number | null;
  leadDays: number | null;
};
export function BusinessInquiry({
  kind,
  products = [],
  sitekey,
  available,
}: {
  kind: "contact" | "enterprise";
  products?: EnterpriseChoice[];
  sitekey: string;
  available: boolean;
}) {
  const [key] = useState(() => globalThis.crypto?.randomUUID?.() ?? ""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<{
      id: string;
      code: string;
      url: string | null;
      number: string | null;
      message: string;
      notification: string;
    } | null>(null);
  const [signed, setSigned] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setStatus("");
    try {
      const common = {
        contactName: String(f.get("contactName")),
        email: String(f.get("email")),
        notes: String(f.get("notes")),
        consent: f.get("consent") === "on",
      };
      const fields =
        kind === "contact"
          ? common
          : {
              ...common,
              organization: f.get("organization"),
              organizationType: f.get("organizationType"),
              role: f.get("role"),
              phone: f.get("phone"),
              gstin: f.get("gstin"),
              items: products
                .filter((p) => Number(f.get(`qty-${p.id}`)) > 0)
                .map((p) => ({
                  product: p.id,
                  quantity: Number(f.get(`qty-${p.id}`)),
                })),
              branding: {
                colours: f.get("colours"),
                text: f.get("brandingText"),
              },
              deadline: f.get("deadline"),
              city: f.get("city"),
              pincode: f.get("pincode"),
              budgetMinPaise: Math.round(Number(f.get("budgetMin")) * 100),
              budgetMaxPaise: Math.round(Number(f.get("budgetMax")) * 100),
            };
      const d = await privateRequest<NonNullable<typeof receipt>>(
        "/api/inquiries",
        {
          kind,
          fields,
          idempotencyKey: key,
          challenge: String(f.get("cf-turnstile-response") ?? ""),
        },
      );
      setReceipt(d);
      const s = await fetch("/api/session", { cache: "no-store" }).then((r) =>
        r.json(),
      );
      setSigned(s.signedIn === true);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      (
        window as unknown as { turnstile?: { reset: () => void } }
      ).turnstile?.reset();
    }
  }
  if (!available)
    return (
      <p className="notice">
        {kind === "enterprise" ? "Enterprise enquiries" : "The contact form"}{" "}
        will open after this feature is enabled. No details are submitted here
        yet.
      </p>
    );
  if (receipt)
    return (
      <div className="notice" role="status">
        <h3>
          {kind === "enterprise" ? "Enquiry" : "Message"} {receipt.code} saved
        </h3>
        <p>{receipt.notification}</p>
        {receipt.url && (
          <>
            <a
              className="button whatsapp"
              href={receipt.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Continue on WhatsApp
            </a>
            <p>
              Open WhatsApp and press Send. This site has not sent a WhatsApp
              message.
            </p>
          </>
        )}
        <p>{receipt.message}</p>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(receipt.message);
              setStatus("Copied.");
            } catch {
              setStatus("Select and copy the summary text above.");
            }
          }}
        >
          Copy summary
        </button>
        {receipt.number && <p>Manual number: +{receipt.number}</p>}
        {kind === "enterprise" &&
          (signed ? (
            <PhotoUpload kind="enterprise" parent={receipt.id} />
          ) : (
            <p>
              Your guest enquiry is saved. Logo uploads are available for
              enquiries created while signed in. Discuss a logo directly with
              Memocious for this guest enquiry.
            </p>
          ))}
        <p>{status}</p>
      </div>
    );
  return (
    <form className="enquiry-form" onSubmit={submit}>
      <h3>
        {kind === "enterprise"
          ? "Tell us about your gifting"
          : "Send a message"}
      </h3>
      {kind === "enterprise" && (
        <>
          <p>
            For private logo upload, sign in before submitting, then reopen this
            form. Guest submission works without a logo.
          </p>
          <label className="form-field">
            Organization
            <input name="organization" required maxLength={120} />
          </label>
          <label className="form-field">
            Organization type
            <select name="organizationType">
              <option value="company">Company</option>
              <option value="college">College</option>
              <option value="event">Event</option>
              <option value="ngo">NGO</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="form-field">
            Your role
            <input name="role" required maxLength={120} />
          </label>
        </>
      )}
      <label className="form-field">
        Contact name
        <input
          name="contactName"
          required
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label className="form-field">
        Email
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      {kind === "enterprise" && (
        <>
          <label className="form-field">
            Phone with country code
            <input
              name="phone"
              type="tel"
              required
              maxLength={20}
              autoComplete="tel"
              placeholder="+91..."
            />
          </label>
          <label className="form-field">
            GSTIN (optional)
            <input name="gstin" maxLength={15} />
          </label>
          <fieldset>
            <legend>Select gifts by entering a quantity</legend>
            {products.length === 0 ? (
              <p>
                No enterprise gifts currently published. Please contact us for
                availability.
              </p>
            ) : (
              products.map((p) => (
                <label className="form-field" key={p.id}>
                  {p.name} - minimum {p.moq ?? 1}
                  {p.leadDays !== null
                    ? `, ${p.leadDays} working days preparation`
                    : "; lead time by confirmation"}
                  <input
                    type="number"
                    name={`qty-${p.id}`}
                    min={0}
                    max={10000}
                    defaultValue={0}
                  />
                </label>
              ))
            )}
          </fieldset>
          <label className="form-field">
            Brand colours (optional)
            <input name="colours" maxLength={120} />
          </label>
          <label className="form-field">
            Branding text (optional)
            <textarea name="brandingText" maxLength={500} />
          </label>
          <label className="form-field">
            Requested date
            <input type="date" name="deadline" required />
          </label>
          <label className="form-field">
            Delivery city
            <input name="city" required maxLength={120} />
          </label>
          <label className="form-field">
            Pincode
            <input name="pincode" required pattern="[0-9]{6}" maxLength={6} />
          </label>
          <label className="form-field">
            Budget from (INR)
            <input
              name="budgetMin"
              type="number"
              min={0}
              max={10000000000}
              step="0.01"
              required
            />
          </label>
          <label className="form-field">
            Budget to (INR)
            <input
              name="budgetMax"
              type="number"
              min={0}
              max={10000000000}
              step="0.01"
              required
            />
          </label>
        </>
      )}
      <label className="form-field">
        {kind === "contact" ? "Message" : "Notes"}
        <textarea name="notes" required maxLength={2000} />
      </label>
      <label className="check-label">
        <input name="consent" type="checkbox" required />I agree to the{" "}
        <Link href="/privacy">privacy notice</Link> and use of these details to
        respond to this request.
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
      <button
        type="submit"
        className="button"
        disabled={busy || (kind === "enterprise" && products.length === 0)}
      >
        {busy ? "Saving..." : "Save request"}
      </button>
      <p role="status">{status}</p>
      <p className="quiet-note">
        Requested dates, branding, shipping and final price need owner
        confirmation. Email notifications are not enabled.
      </p>
    </form>
  );
}
