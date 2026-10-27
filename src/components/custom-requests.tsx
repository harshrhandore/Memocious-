"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { privateRequest } from "@/lib/client-request";
import type { CustomContinuation } from "@/lib/custom-request";
import { money } from "@/lib/domain";
export function CustomReceiptView({
  receipt: r,
}: {
  receipt: CustomContinuation;
}) {
  const [status, setStatus] = useState("");
  return (
    <article className="notice">
      <h3>Custom request {r.code}</h3>
      <p>
        {r.name}; quantity {r.quantity}. Status: {r.status.replaceAll("_", " ")}
      </p>
      <ul>
        {r.options.map((o) => (
          <li key={o.label}>{o.label}</li>
        ))}
      </ul>
      <p>{r.personalMessage}</p>
      <p>
        Requested {r.requestedDate}; pincode {r.pincode}. Budget{" "}
        {money(r.budgetMinPaise)} to {money(r.budgetMaxPaise)}.
      </p>
      <p>
        {r.estimateMinPaise === null
          ? "Owner quotation needed."
          : `Provisional estimate: ${money(r.estimateMinPaise)}${r.estimateMaxPaise === null ? "; upper estimate unavailable" : ` to ${money(r.estimateMaxPaise)}`}.`}{" "}
        Customisation, shipping and final price require owner confirmation.
      </p>
      {r.quotePaise !== null && (
        <p>
          Owner quote: {money(r.quotePaise)}. {r.quoteTerms} Valid until{" "}
          {r.quoteValidUntil}.
        </p>
      )}
      <p>
        {r.fileCount} private reference image(s) saved for owner review. Images
        are not attached to WhatsApp.
      </p>
      {r.files?.map((f) => (
        <a
          className="underline"
          key={f.id}
          href={`/api/builder/files/${f.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View private reference image{" "}
        </a>
      ))}
      <p>
        This request is saved. Opening WhatsApp does not send a message or
        record payment.
      </p>
      {r.url ? (
        <a
          className="button"
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Continue on WhatsApp
        </a>
      ) : (
        <p>
          WhatsApp handoff is temporarily unavailable. Your request remains
          saved; retry from your account later.
        </p>
      )}
      <button
        className="button secondary"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(r.message);
            setStatus("Summary copied.");
          } catch {
            setStatus("Copy unavailable. Select the summary below.");
          }
        }}
      >
        Copy complete summary
      </button>
      <details>
        <summary>Complete summary</summary>
        <pre className="safe-json">{r.message}</pre>
      </details>
      <p role="status">{status}</p>
      <Link className="underline" href="/account">
        View saved custom requests in your account
      </Link>
    </article>
  );
}
export function CustomRequests() {
  const [records, setRecords] = useState<CustomContinuation[]>([]),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [status, setStatus] = useState("Loading saved requests...");
  useEffect(() => {
    let active = true;
    privateRequest<{ records: CustomContinuation[]; hasMore: boolean }>(
      `/api/builder/requests?page=${page}`,
    )
      .then((r) => {
        if (active) {
          setRecords(r.records);
          setMore(r.hasMore);
          setStatus(r.records.length ? "" : "No custom requests saved yet.");
        }
      })
      .catch((e) => {
        if (active) {
          setRecords([]);
          setMore(false);
          setStatus(e.message);
        }
      });
    return () => {
      active = false;
    };
  }, [page]);
  return (
    <section>
      <h2>Your custom requests</h2>
      <p role="status">{status}</p>
      {records.map((r) => (
        <CustomReceiptView key={r.id} receipt={r} />
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={page === 1}
        onClick={() => setPage((p) => p - 1)}
      >
        Previous requests
      </button>
      <button
        type="button"
        className="button secondary"
        disabled={!more}
        onClick={() => setPage((p) => p + 1)}
      >
        Next requests
      </button>
    </section>
  );
}
