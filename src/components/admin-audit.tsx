"use client";
import { useEffect, useRef, useState } from "react";
import {
  auditDates,
  auditQuery,
  type AuditCursor,
  type AuditPage,
} from "@/lib/audit-domain";
export function AdminAudit() {
  const [filters, setFilters] = useState(() => ({
      ...auditDates(),
      action: "",
      entity: "",
    })),
    [cursors, setCursors] = useState<(AuditCursor | null)[]>([null]),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<AuditPage | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const snapshot = useRef<string | null>(null),
    cursor = cursors[cursors.length - 1],
    query = JSON.stringify(filters);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null);
    setBusy(true);
    setStatus(
      revision === 0
        ? "Loading protected audit records..."
        : "Loading updated audit records...",
    );
    const params = new URLSearchParams(JSON.parse(query));
    if (snapshot.current) params.set("asOf", snapshot.current);
    if (cursor) {
      params.set("cursorAt", cursor.at);
      params.set("cursorId", cursor.id);
    }
    fetch(`/api/admin/audit?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            body.message ||
              "Audit records are unavailable. Owner access and recent authenticator verification are required.",
          );
        }
        return r.json();
      })
      .then((r: AuditPage) => {
        if (active) {
          snapshot.current = r.asOf;
          setData(r);
          setStatus(
            r.records.length ? "" : "No audit records match these filters.",
          );
        }
      })
      .catch((e) => {
        if (active && !controller.signal.aborted) {
          setData(null);
          setStatus(
            e instanceof Error
              ? e.message
              : "Audit records could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, cursor, revision]);
  function restart() {
    snapshot.current = null;
    setCursors([null]);
    setRevision((r) => r + 1);
  }
  return (
    <section aria-label="Owner audit records">
      <p>
        Search recorded actions. Personal details and security information are
        hidden. Some actions have only a summary, without before-and-after
        values.
      </p>
      <form
        className="audit-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const values = Object.fromEntries(new FormData(e.currentTarget));
          const parsed = auditQuery.safeParse(
            Object.fromEntries(
              Object.entries(values).filter(([, v]) => v !== ""),
            ),
          );
          if (!parsed.success) {
            setStatus(
              "Check the filters. Choose a date range of up to 90 days and valid identifiers.",
            );
            return;
          }
          const { from, to, action, entity, entityId, requestId } = parsed.data;
          setFilters({
            from: from!,
            to: to!,
            action,
            entity,
            ...(entityId ? { entityId } : {}),
            ...(requestId ? { requestId } : {}),
          });
          restart();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Search audit records</legend>
          <div className="studio-grid">
            <label className="form-field form-label">
              From date
              <input
                type="date"
                name="from"
                required
                defaultValue={filters.from}
              />
            </label>
            <label className="form-field form-label">
              Through date
              <input type="date" name="to" required defaultValue={filters.to} />
            </label>
            <label className="form-field form-label">
              Action prefix
              <input
                name="action"
                maxLength={64}
                pattern="[a-z0-9_.-]*"
                placeholder="product."
              />
            </label>
            <label className="form-field form-label">
              Record type
              <input
                name="entity"
                maxLength={32}
                pattern="[a-z0-9_.-]*"
                placeholder="product"
              />
            </label>
            <label className="form-field form-label">
              Record ID
              <input name="entityId" maxLength={36} />
            </label>
            <label className="form-field form-label">
              Request ID
              <input name="requestId" maxLength={36} />
            </label>
          </div>
          <p className="quiet-note">
            Dates use Asia/Kolkata calendar days. Each search covers at most 90
            days.
          </p>
          <button className="button" type="submit">
            Search audit records
          </button>
        </fieldset>
      </form>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={restart}
      >
        Refresh latest audit records
      </button>
      <p role="status">{status}</p>
      {data && (
        <>
          <p className="quiet-note">
            Snapshot {new Date(data.asOf).toLocaleString()}.{" "}
            {data.records.length} records on page {cursors.length}. Refresh to
            include newer actions.
          </p>
          <ol className="audit-entries">
            {data.records.map((entry) => (
              <li key={entry.id}>
                <article>
                  <div className="audit-entry-title">
                    <h3>{entry.action}</h3>
                    <span>{entry.actorKind}</span>
                  </div>
                  <p>
                    <time dateTime={entry.at}>
                      {new Date(entry.at).toLocaleString()}
                    </time>{" "}
                    - {entry.entity}
                  </p>
                  {entry.entityId && (
                    <p>
                      Record: <code>{entry.entityId}</code>
                    </p>
                  )}
                  <p>
                    Request: <code>{entry.requestId}</code>
                  </p>
                  {entry.metadata.version !== undefined && (
                    <p>Recorded version: {entry.metadata.version}</p>
                  )}
                  {entry.metadata.count !== undefined && (
                    <p>Affected records: {entry.metadata.count}</p>
                  )}
                  {entry.metadata.configured !== undefined && (
                    <p>
                      Configured: {entry.metadata.configured ? "Yes" : "No"}
                    </p>
                  )}
                  {entry.withheld && (
                    <p className="quiet-note">
                      Some stored details are hidden for privacy.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="inline-actions">
        <button
          className="button secondary"
          type="button"
          disabled={busy || cursors.length === 1}
          onClick={() => setCursors((rows) => rows.slice(0, -1))}
        >
          Previous audit page
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy || !data?.hasMore || !data.nextCursor}
          onClick={() => {
            if (data?.nextCursor)
              setCursors((rows) => [...rows, data.nextCursor]);
          }}
        >
          Next audit page
        </button>
      </div>
      <p className="quiet-note">
        No background polling runs here. If verification expires, open Security
        and verify the owner authenticator again, then refresh.
      </p>
    </section>
  );
}
