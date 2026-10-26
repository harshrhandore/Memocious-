"use client";
import { useCallback, useEffect, useState } from "react";
import { privateRequest } from "@/lib/client-request";
import { PhotoUpload } from "./reviews";
type Review = {
  id: string;
  name: string;
  firstName: string;
  rating: number;
  body: string;
  status: string;
  version: number;
  photo: string | null;
  deleted: boolean;
};
type Enterprise = {
  assets: string[];
  id: string;
  code: string;
  organization: string;
  contact_name: string;
  phone: string;
  email: string;
  notes: string;
  items: unknown;
  branding: unknown;
  pipeline: string;
  version: number;
  quote_paise: number | null;
  quote_terms: string | null;
  quote_valid_until: string | null;
  linked_order_id: string | null;
};
type Proof = {
  id: string;
  caption: string;
  first_name: string;
  city: string;
  consent_reference: string;
  sort_order: number;
  active: boolean;
  version: number;
  asset_id: string | null;
};
type Counter = {
  id: string;
  label: string;
  value: number;
  evidence_reference: string;
  active: boolean;
  version: number;
};
type State = {
  hasMore?: boolean;
  reviews: Review[];
  reports: { id: string; reviewId: string; reason: string; status: string }[];
};
type Inquiries = {
  hasMore?: boolean;
  enterprise: Enterprise[];
  contacts: {
    id: string;
    name: string;
    email: string;
    body: string;
    status: string;
  }[];
  privacy: { id: string; name: string; status: string }[];
  newCount: number;
  events: {
    entity_id: string;
    kind: string;
    version: number;
    payload: unknown;
    created_at: string;
  }[];
};
type ProofState = {
  hasMore?: boolean;
  proof: Proof[];
  counters: Counter[];
  documents: {
    id: string;
    title: string;
    version: number;
    published: boolean;
  }[];
};
export function AdminPhase2() {
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<State | null>(null),
    [inquiries, setInquiries] = useState<Inquiries | null>(null),
    [proof, setProof] = useState<ProofState | null>(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [r, i, p] = await Promise.all([
      privateRequest<State>(`/api/admin/reviews?page=${page}`),
      privateRequest<Inquiries>(`/api/admin/inquiries?page=${page}`),
      privateRequest<ProofState>(`/api/admin/proof?page=${page}`),
    ]);
    setReviews(r);
    setInquiries(i);
    setProof(p);
  }, [page]);
  useEffect(() => {
    load().catch((e) => setStatus(e.message));
  }, [load]);
  async function send(path: string, body: unknown) {
    setBusy(true);
    setStatus("");
    try {
      await privateRequest(path, body);
      await load();
      setStatus("Saved. Publication and enquiry state updated.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function prepare(id: string) {
    await send("/api/admin/assets", { id });
  }
  return (
    <section className="section">
      <h2>Trust and enquiries</h2>
      <nav aria-label="Owner queue pages">
        <button
          type="button"
          className="button secondary"
          disabled={busy || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous queue page
        </button>
        <span> Page {page} </span>
        <button
          type="button"
          className="button secondary"
          disabled={
            busy || !(reviews?.hasMore || inquiries?.hasMore || proof?.hasMore)
          }
          onClick={() => setPage((p) => p + 1)}
        >
          Next queue page
        </button>
      </nav>
      <p>
        New enterprise enquiries: {inquiries?.newCount ?? "Loading"}. Email
        notifications are not enabled. Publication and changes require a recent
        authenticator verification.
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => load().catch((e) => setStatus(e.message))}
      >
        Refresh queues
      </button>
      <p role="status">{status}</p>
      <details>
        <summary>Reviews and reports</summary>
        {reviews?.reviews.map((r) => (
          <article className="review-card" key={r.id}>
            <h3>
              {r.name} - {r.rating}/5
            </h3>
            <p>
              {r.firstName}: {r.body}
            </p>
            <p>
              {r.deleted ? "deleted" : r.status} - version {r.version}
            </p>
            {r.photo && (
              <>
                <img
                  src={`/api/uploads/${r.photo}`}
                  alt="Private review preview"
                  width={240}
                  height={180}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => prepare(r.photo!)}
                >
                  Prepare consented public copy
                </button>
              </>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                send("/api/admin/reviews", {
                  id: r.id,
                  version: r.version,
                  action: f.get("action"),
                  note: f.get("note"),
                  reportId: null,
                });
              }}
            >
              <label className="form-field">
                Moderation note
                <input name="note" maxLength={2000} />
              </label>
              <label>
                Action
                <select name="action">
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="delete">Delete</option>
                </select>
              </label>
              <button
                type="submit"
                className="button"
                disabled={busy || r.deleted}
              >
                Apply moderation
              </button>
            </form>
          </article>
        ))}
        {reviews?.reports.map((r) => (
          <article key={r.id}>
            <p>
              Report on review {r.reviewId}: {r.reason} ({r.status})
            </p>
            <button
              type="button"
              disabled={busy || r.status === "reviewed"}
              className="button secondary"
              onClick={() =>
                send("/api/admin/reviews", {
                  id: null,
                  version: null,
                  action: "report-reviewed",
                  note: "",
                  reportId: r.id,
                })
              }
            >
              Mark reviewed
            </button>
          </article>
        ))}
      </details>
      <details>
        <summary>Enterprise enquiries and quote history</summary>
        {inquiries?.enterprise.map((e) => (
          <article className="review-card" key={e.id}>
            <h3>
              {e.code} - {e.organization}
            </h3>
            <p>
              {e.contact_name}, +{e.phone}, {e.email}
            </p>
            <p>{e.notes}</p>
            <pre className="safe-json">
              {JSON.stringify(
                { items: e.items, branding: e.branding },
                null,
                2,
              )}
            </pre>
            <p>
              State: {e.pipeline}. Version {e.version}. Linked order:{" "}
              {e.linked_order_id ?? "none"}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                send("/api/admin/inquiries", {
                  entity: e.id,
                  expectedVersion: e.version,
                  action: "update",
                  fields: {
                    pipeline: f.get("pipeline"),
                    reason: f.get("reason"),
                    terms: f.get("terms"),
                    quotePaise:
                      f.get("quote") !== ""
                        ? Math.round(Number(f.get("quote")) * 100)
                        : null,
                    agreement: f.get("agreement") === "on",
                    validUntil: f.get("validUntil") || null,
                  },
                });
              }}
            >
              <label className="form-field">
                Pipeline
                <select name="pipeline" defaultValue={e.pipeline}>
                  {[
                    "new",
                    "contacted",
                    "quote_sent",
                    "negotiation",
                    "won",
                    "lost",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Quote total INR (optional unless quoting/won)
                <input
                  name="quote"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    e.quote_paise === null ? "" : e.quote_paise / 100
                  }
                />
              </label>
              <label className="form-field">
                Quotation terms / revision
                <textarea
                  name="terms"
                  maxLength={4000}
                  defaultValue={e.quote_terms ?? ""}
                />
              </label>
              <label className="form-field">
                Quotation valid until
                <input
                  name="validUntil"
                  type="date"
                  defaultValue={e.quote_valid_until ?? ""}
                />
              </label>
              <label className="form-field">
                Internal note / transition reason
                <textarea name="reason" required maxLength={2000} />
              </label>
              <label className="check-label">
                <input name="agreement" type="checkbox" />I confirm genuine
                customer agreement for a won enquiry.
              </label>
              <button type="submit" className="button" disabled={busy}>
                Save update
              </button>
            </form>
            {e.pipeline === "won" && (
              <button
                type="button"
                className="button secondary"
                disabled={busy || !!e.linked_order_id}
                onClick={() =>
                  send("/api/admin/inquiries", {
                    entity: e.id,
                    expectedVersion: e.version,
                    action: "convert",
                  })
                }
              >
                Convert agreement to order
              </button>
            )}
            <details>
              <summary>Versioned history</summary>
              {inquiries.events
                .filter((x) => x.entity_id === e.id)
                .map((x) => (
                  <p key={x.version}>
                    {x.created_at} - {x.kind} v{x.version}:{" "}
                    {JSON.stringify(x.payload)}
                  </p>
                ))}
            </details>
          </article>
        ))}
      </details>
      <details>
        <summary>Contact messages and privacy requests</summary>
        {inquiries?.contacts.map((c) => (
          <article key={c.id}>
            <h3>{c.name}</h3>
            <p>
              {c.email}: {c.body} ({c.status})
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={busy || c.status === "reviewed"}
              onClick={() =>
                send("/api/admin/inquiries", {
                  entity: c.id,
                  expectedVersion: null,
                  action: "contact-reviewed",
                })
              }
            >
              Mark reviewed
            </button>
          </article>
        ))}
        {inquiries?.privacy.map((p) => (
          <article key={p.id}>
            <p>
              Deletion request: {p.name} - {p.status}. Follow the retention
              runbook; this action does not erase data.
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={busy || p.status !== "pending"}
              onClick={() =>
                send("/api/admin/inquiries", {
                  entity: p.id,
                  expectedVersion: null,
                  action: "privacy-reviewing",
                })
              }
            >
              Start retention review
            </button>
          </article>
        ))}
      </details>
      <details>
        <summary>Genuine sales proof and counters</summary>
        <p>
          Publish only redacted images with recorded consent and rights.
          Counters need a genuine evidence reference.
        </p>
        <ProofForm busy={busy} send={send} />
        {proof?.proof.map((p) => (
          <article className="review-card" key={p.id}>
            <ProofForm item={p} busy={busy} send={send} />
            <PhotoUpload kind="proof" parent={p.id} onReady={load} />
            {p.asset_id && (
              <>
                <img
                  src={`/api/uploads/${p.asset_id}`}
                  alt="Private sales proof preview"
                  width={240}
                  height={180}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => prepare(p.asset_id!)}
                >
                  Prepare public copy after preview
                </button>
              </>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                send("/api/admin/proof", {
                  entity: p.id,
                  expectedVersion: p.version,
                  action: "proof-delete",
                  fields: {},
                })
              }
            >
              Hide proof
            </button>
          </article>
        ))}
        <CounterForm busy={busy} send={send} />
        {proof?.counters.map((c) => (
          <CounterForm key={c.id} item={c} busy={busy} send={send} />
        ))}
      </details>
      <details>
        <summary>Owner-managed catalogue PDF</summary>
        <p>
          Create a static text catalogue from published enterprise gifts.
          Download and review it before explicitly publishing. Uploaded PDFs are
          disabled.
        </p>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() =>
            send("/api/admin/proof", {
              entity: null,
              expectedVersion: null,
              action: "catalogue-create",
              fields: {},
            })
          }
        >
          Generate draft catalogue
        </button>
        {proof?.documents.map((d) => (
          <article key={d.id}>
            <p>
              {d.title} ({d.published ? "published" : "private draft"})
            </p>
            <a href={`/catalogue/${d.id}?preview=1`}>Download preview</a>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send("/api/admin/proof", {
                  entity: d.id,
                  expectedVersion: d.version,
                  action: d.published ? "catalogue-hide" : "catalogue-publish",
                  fields: {},
                });
              }}
            >
              <label className="check-label">
                <input type="checkbox" required />I reviewed this PDF and
                approve this publication change.
              </label>
              <button
                type="submit"
                className="button secondary"
                disabled={busy}
              >
                {d.published ? "Hide catalogue" : "Publish reviewed catalogue"}
              </button>
            </form>
          </article>
        ))}
      </details>
    </section>
  );
}
type Sender = (path: string, body: unknown) => Promise<void>;
function ProofForm({
  item,
  busy,
  send,
}: {
  item?: Proof;
  busy: boolean;
  send: Sender;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        send("/api/admin/proof", {
          entity: item?.id ?? null,
          expectedVersion: item?.version ?? null,
          action: "proof-save",
          fields: {
            caption: f.get("caption"),
            firstName: f.get("firstName"),
            city: f.get("city"),
            consentReference: f.get("consentReference"),
            active: f.get("active") === "on",
            position: Number(f.get("position")),
          },
        });
      }}
    >
      <h3>{item ? "Edit proof" : "New proof draft"}</h3>
      {(
        [
          ["caption", "Caption", 500, item?.caption],
          ["firstName", "First name (optional)", 60, item?.first_name],
          ["city", "City (optional)", 120, item?.city],
          [
            "consentReference",
            "Consent/rights reference (private)",
            500,
            item?.consent_reference,
          ],
        ] as const
      ).map(([name, label, max, value]) => (
        <label className="form-field" key={name}>
          {label}
          <input
            name={name}
            defaultValue={value ?? ""}
            maxLength={max}
            required={name === "caption" || name === "consentReference"}
          />
        </label>
      ))}
      <label className="form-field">
        Position
        <input
          name="position"
          type="number"
          min={0}
          max={10000}
          defaultValue={item?.sort_order ?? 0}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          name="active"
          defaultChecked={item?.active}
          disabled={!item?.asset_id}
        />
        Publish this consented, redacted proof
      </label>
      <button type="submit" className="button secondary" disabled={busy}>
        Save proof
      </button>
    </form>
  );
}
function CounterForm({
  item,
  busy,
  send,
}: {
  item?: Counter;
  busy: boolean;
  send: Sender;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        send("/api/admin/proof", {
          entity: item?.id ?? null,
          expectedVersion: item?.version ?? null,
          action: "counter-save",
          fields: {
            label: f.get("label"),
            value: Number(f.get("value")),
            evidenceReference: f.get("evidenceReference"),
            active: f.get("active") === "on",
          },
        });
      }}
    >
      <h3>{item ? "Edit counter" : "New genuine counter"}</h3>
      <label className="form-field">
        Label
        <input
          name="label"
          required
          maxLength={80}
          defaultValue={item?.label}
        />
      </label>
      <label className="form-field">
        Actual count
        <input
          name="value"
          type="number"
          min={0}
          max={1000000000}
          required
          defaultValue={item?.value}
        />
      </label>
      <label className="form-field">
        Evidence reference (private)
        <input
          name="evidenceReference"
          required
          maxLength={500}
          defaultValue={item?.evidence_reference}
        />
      </label>
      <label className="check-label">
        <input name="active" type="checkbox" defaultChecked={item?.active} />
        Publish counter
      </label>
      <button type="submit" className="button secondary" disabled={busy}>
        Save counter
      </button>
    </form>
  );
}
