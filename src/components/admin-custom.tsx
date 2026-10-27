"use client";
import { useCallback, useEffect, useState } from "react";
import { privateRequest } from "@/lib/client-request";
import { money } from "@/lib/domain";
type RequestRecord = {
  id: string;
  code: string;
  version: number;
  status: string;
  quantity: number;
  message: string;
  contact: { name: string; phone: string; email: string; city: string };
  quote_paise: number | null;
  quote_terms: string | null;
  quote_valid_until: string | null;
  linked_order_id: string | null;
  immutable_snapshot: unknown;
  files: { id: string; status: string }[];
  history: unknown[];
  historyHasMore?: boolean;
};
const states = [
  "new",
  "contacted",
  "quote_sent",
  "negotiation",
  "won",
  "lost",
  "closed",
  "cancelled",
];
function RequestEditor({
  record: r,
  onChanged,
}: {
  record: RequestRecord;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <details className="notice">
      <summary>
        {r.code}: {r.status} - {r.contact.name}
      </summary>
      <p>
        {r.contact.phone}; {r.contact.email}; {r.contact.city}. Quantity{" "}
        {r.quantity}.
      </p>
      <p>{r.message}</p>
      {r.files.map((f, i) => (
        <p key={f.id}>
          <a
            className="underline"
            href={`/api/builder/files/${f.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View private reference {i + 1}
          </a>
        </p>
      ))}
      <details>
        <summary>Immutable submitted plan</summary>
        <pre className="safe-json">
          {JSON.stringify(r.immutable_snapshot, null, 2)}
        </pre>
      </details>
      <p>
        {r.quote_paise === null
          ? "No quote"
          : `Current quote ${money(r.quote_paise)}`}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          setNotice("");
          try {
            await privateRequest("/api/admin/custom", {
              action: "update",
              id: r.id,
              version: r.version,
              fields: {
                status: d.get("status"),
                reason: d.get("reason"),
                quotePaise:
                  d.get("quote") === "" ? null : Number(d.get("quote")),
                terms: d.get("terms"),
                validUntil: d.get("validUntil") || null,
                agreement: d.get("agreement") === "on",
              },
            });
            await onChanged();
            setNotice("Request updated.");
          } catch (e) {
            setNotice(
              e instanceof Error
                ? e.message
                : "Update failed. Reload before retrying.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Status
            <select name="status" defaultValue={r.status}>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Total quote in integer paise
            <input
              name="quote"
              type="number"
              min="0"
              max="1000000000000"
              step="1"
              defaultValue={r.quote_paise ?? ""}
            />
          </label>
          <label>
            Quote terms
            <textarea
              name="terms"
              maxLength={4000}
              defaultValue={r.quote_terms ?? ""}
            />
          </label>
          <label>
            Quote valid until
            <input
              name="validUntil"
              type="date"
              defaultValue={r.quote_valid_until ?? ""}
            />
          </label>
          <label>
            Internal reason / note
            <textarea name="reason" required maxLength={2000} />
          </label>
          <label className="check-label">
            <input name="agreement" type="checkbox" />
            The customer genuinely agreed to this quote. No payment inferred.
          </label>
          <button className="button" type="submit">
            Save request update
          </button>
        </fieldset>
      </form>
      {r.linked_order_id ? (
        <p>
          Linked order {r.code} ({r.linked_order_id}). Use its order workflow
          for subsequent changes.
        </p>
      ) : (
        <button
          className="button secondary"
          type="button"
          disabled={busy || r.status !== "won"}
          onClick={async () => {
            setBusy(true);
            try {
              await privateRequest("/api/admin/custom", {
                action: "convert",
                id: r.id,
                version: r.version,
              });
              await onChanged();
              setNotice("Order linked. No payment recorded.");
            } catch (e) {
              setNotice(
                e instanceof Error
                  ? e.message
                  : "Conversion response unavailable. Reload before retrying.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Convert agreed quote to one order
        </button>
      )}
      <p role="status">{notice}</p>
      <details>
        <summary>Request and quotation history (latest 20 events)</summary>
        {r.historyHasMore && (
          <p>
            Older events remain retained in the audit data; this view shows the
            latest 20.
          </p>
        )}
        <pre className="safe-json">{JSON.stringify(r.history, null, 2)}</pre>
      </details>
    </details>
  );
}
export function AdminCustomRequests() {
  const [records, setRecords] = useState<RequestRecord[]>([]),
    [page, setPage] = useState(1),
    [code, setCode] = useState(""),
    [filter, setFilter] = useState(""),
    [more, setMore] = useState(false),
    [fresh, setFresh] = useState(0),
    [status, setStatus] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await privateRequest<{
        records: RequestRecord[];
        hasMore: boolean;
        newCount: number;
      }>(
        `/api/admin/custom?page=${page}&code=${encodeURIComponent(code)}&status=${filter}`,
      );
      setRecords(r.records);
      setMore(r.hasMore);
      setFresh(r.newCount);
      setStatus(r.records.length ? "" : "No matching requests.");
    } catch (e) {
      setRecords([]);
      setMore(false);
      setStatus(e instanceof Error ? e.message : "Unable to load requests.");
    }
  }, [page, code, filter]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="my-8">
      <h2>Custom gift requests ({fresh} new)</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setPage(1);
          setCode(String(d.get("code") ?? ""));
          setFilter(String(d.get("status") ?? ""));
        }}
      >
        <label>
          Request code prefix
          <input name="code" maxLength={40} pattern="[a-zA-Z0-9-]*" />
        </label>
        <label>
          Request status
          <select name="status">
            <option value="">All statuses</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button secondary">
          Search requests
        </button>
      </form>
      <button
        className="button secondary"
        type="button"
        onClick={() => void load()}
      >
        Reload current requests
      </button>
      <p role="status">{status}</p>
      {records.map((r) => (
        <RequestEditor
          key={`${r.id}:${r.version}`}
          record={r}
          onChanged={load}
        />
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
      <p>
        Mutations require recent owner MFA. Quotes and notes are recorded in
        history; chat clicks never mark messages sent or payments received.
      </p>
    </section>
  );
}
