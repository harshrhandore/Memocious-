"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { privateRequest, RequestError } from "@/lib/client-request";
import {
  builderPayload,
  budgetPresets,
  emptyBuilderPayload,
  type BuilderDraft,
  type BuilderPayload,
} from "@/lib/builder-domain";
import type { Taxon } from "@/lib/domain";
const steps = ["Budget", "Gift type", "Occasion and recipient", "Your words"];
export function BuilderDraftEditor({
  categories,
  occasions,
  available,
}: {
  categories: Taxon[];
  occasions: Taxon[];
  available: boolean;
}) {
  const [payload, setPayload] = useState<BuilderPayload>({
      ...emptyBuilderPayload,
    }),
    [step, setStep] = useState(1),
    [record, setRecord] = useState<BuilderDraft | null>(null),
    [drafts, setDrafts] = useState<BuilderDraft[]>([]),
    [signed, setSigned] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    [conflict, setConflict] = useState(false),
    [comparison, setComparison] = useState<BuilderPayload | null>(null),
    [status, setStatus] = useState(
      "Not saved. Explore in this tab; signing in is required to save.",
    ),
    [confirmDelete, setConfirmDelete] = useState(false);
  const lastSaved = useRef(""),
    newId = useRef<string | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const snapshot = JSON.stringify({ payload, step });
  useEffect(() => {
    if (!available) return;
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (s) => {
        if (!active) return;
        setSigned(s.signedIn === true);
        if (s.signedIn) {
          const rows = await privateRequest<BuilderDraft[]>(
            "/api/builder/drafts",
          );
          if (active)
            setDrafts((existing) =>
              [
                ...existing,
                ...rows.filter((r) => !existing.some((d) => d.id === r.id)),
              ].slice(0, 10),
            );
        }
      })
      .catch(() => {
        if (active)
          setStatus(
            "Saved drafts could not be loaded. Your current edits remain in this tab.",
          );
      });
    return () => {
      active = false;
    };
  }, [available]);
  const persist = useCallback(async () => {
    if (!signed || !available || busy || conflict) return;
    const valid = builderPayload.safeParse(payload);
    if (!valid.success) {
      setStatus(
        "Check both budget limits before saving. Your edits remain in this tab.",
      );
      return;
    }
    const sent = JSON.stringify({ payload, step });
    setBusy(true);
    setStatus("Saving...");
    try {
      newId.current ??= crypto.randomUUID();
      const saved = await privateRequest<BuilderDraft>("/api/builder/drafts", {
        action: record ? "save" : "create",
        id: record?.id ?? newId.current,
        expectedVersion: record?.version ?? 0,
        schemaVersion: 1,
        step,
        payload: valid.data,
      });
      lastSaved.current = sent;
      setRecord(saved);
      setDrafts((rows) =>
        [saved, ...rows.filter((r) => r.id !== saved.id)].slice(0, 10),
      );
      setFailed(false);
      setStatus("Saved to your account.");
    } catch (e) {
      setFailed(true);
      if (e instanceof RequestError && e.status === 409) {
        setConflict(true);
        setStatus(
          "This draft changed in another tab or device. Your edits are kept here; load the latest version to compare.",
        );
      } else
        setStatus(
          e instanceof Error
            ? e.message
            : "Save failed. Your edits remain in this tab.",
        );
    } finally {
      setBusy(false);
    }
  }, [signed, available, busy, conflict, payload, step, record]);
  useEffect(() => {
    if (!record || busy || failed || conflict || snapshot === lastSaved.current)
      return;
    const timer = setTimeout(() => {
      void persist();
    }, 2000);
    return () => clearTimeout(timer);
  }, [record, busy, failed, conflict, snapshot, persist]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        snapshot !== lastSaved.current &&
        (payload.message ||
          payload.giftTypeId ||
          payload.recipient ||
          payload.budgetMinPaise !== null)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot, payload]);
  function apply(d: BuilderDraft) {
    setRecord(d);
    setPayload(d.payload);
    setStep(d.step);
    lastSaved.current = JSON.stringify({ payload: d.payload, step: d.step });
    setFailed(false);
    setConflict(false);
    setConfirmDelete(false);
    setStatus("Loaded your saved draft.");
  }
  async function load(id: string) {
    setBusy(true);
    try {
      const d = await privateRequest<BuilderDraft>(
        `/api/builder/drafts?id=${id}`,
      );
      if (snapshot !== lastSaved.current) setComparison({ ...payload });
      apply(d);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not load this draft.");
    } finally {
      setBusy(false);
    }
  }
  function move(next: number) {
    setStep(next);
    setTimeout(() => heading.current?.focus(), 0);
  }
  const budgetValid =
    payload.budgetMinPaise !== null &&
    payload.budgetMaxPaise !== null &&
    payload.budgetMinPaise <= payload.budgetMaxPaise &&
    builderPayload.safeParse(payload).success;
  return (
    <section aria-label="Custom gift draft editor">
      <p className="notice">
        Builder development preview: plan and save the first four steps. Photos,
        add-ons, estimates and quote submission are not available yet. This
        draft creates no enquiry or order.
      </p>
      {!available && (
        <p>
          Account saving is disabled until the builder migrations and
          verification are ready. Your exploration stays in memory and is lost
          when you leave.
        </p>
      )}
      {signed && (
        <details>
          <summary>My saved drafts ({drafts.length}/10 active)</summary>
          {drafts.length === 0 ? (
            <p>No saved drafts.</p>
          ) : (
            <ul>
              {drafts.map((d) => (
                <li key={d.id}>
                  Updated {new Date(d.updatedAt).toLocaleDateString()} - step{" "}
                  {d.step}, version {d.version}{" "}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => load(d.id)}
                  >
                    Open draft
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      <nav aria-label="Draft steps">
        <ol className="inline-actions">
          {steps.map((name, i) => (
            <li key={name} aria-current={step === i + 1 ? "step" : undefined}>
              {i + 1}. {name}
            </li>
          ))}
        </ol>
      </nav>
      <h2 tabIndex={-1} ref={heading}>
        {steps[step - 1]}
      </h2>
      {step === 1 && (
        <fieldset>
          <legend>Choose a budget per gift (INR)</legend>
          {budgetPresets.map((p) => (
            <button
              type="button"
              key={p.label}
              className="button secondary"
              aria-pressed={
                payload.budgetMinPaise === p.min &&
                payload.budgetMaxPaise === p.max
              }
              onClick={() =>
                setPayload((v) => ({
                  ...v,
                  budgetMinPaise: p.min,
                  budgetMaxPaise: p.max,
                }))
              }
            >
              {p.label}
            </button>
          ))}
          <p>
            Presets do not overlap: INR 500 starts the second range, INR 1,000
            the third and INR 2,000 the fourth.
          </p>
          <label className="form-field">
            Custom minimum INR
            <input
              type="number"
              min={0}
              max={1000000}
              step="0.01"
              value={
                payload.budgetMinPaise === null
                  ? ""
                  : payload.budgetMinPaise / 100
              }
              onChange={(e) =>
                setPayload((v) => ({
                  ...v,
                  budgetMinPaise:
                    e.target.value === ""
                      ? null
                      : Math.round(Number(e.target.value) * 100),
                }))
              }
            />
          </label>
          <label className="form-field">
            Custom maximum INR
            <input
              type="number"
              min={0}
              max={1000000}
              step="0.01"
              value={
                payload.budgetMaxPaise === null
                  ? ""
                  : payload.budgetMaxPaise / 100
              }
              onChange={(e) =>
                setPayload((v) => ({
                  ...v,
                  budgetMaxPaise:
                    e.target.value === ""
                      ? null
                      : Math.round(Number(e.target.value) * 100),
                }))
              }
            />
          </label>
        </fieldset>
      )}
      {step === 2 && (
        <label className="form-field">
          Gift type
          <select
            value={payload.giftTypeId ?? ""}
            onChange={(e) =>
              setPayload((v) => ({ ...v, giftTypeId: e.target.value || null }))
            }
          >
            <option value="">Choose a gift type</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {step === 3 && (
        <>
          <label className="form-field">
            Occasion (optional)
            <select
              value={payload.occasionId ?? ""}
              onChange={(e) =>
                setPayload((v) => ({
                  ...v,
                  occasionId: e.target.value || null,
                }))
              }
            >
              <option value="">No occasion selected</option>
              {occasions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Recipient nickname (optional)
            <input
              value={payload.recipient}
              maxLength={80}
              onChange={(e) =>
                setPayload((v) => ({ ...v, recipient: e.target.value }))
              }
            />
          </label>
          <p>
            A nickname or relationship is enough. Avoid full identities or
            addresses, especially for children.
          </p>
        </>
      )}
      {step === 4 && (
        <>
          <label className="form-field">
            Personal message
            <textarea
              value={payload.message}
              onChange={(e) => {
                if ([...e.target.value].length <= 500)
                  setPayload((v) => ({ ...v, message: e.target.value }));
              }}
            />
          </label>
          <small>{[...payload.message].length}/500 characters</small>
          <div className="notice">
            <h3>Illustrative message preview</h3>
            <p>{payload.message || "Your words will appear here."}</p>
            <p>Final handmade layout is confirmed with Memocious.</p>
          </div>
        </>
      )}
      <div className="inline-actions">
        <button
          type="button"
          className="button secondary"
          disabled={step === 1}
          onClick={() => move(step - 1)}
        >
          Previous step
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={
            step === 4 ||
            (step === 1 && !budgetValid) ||
            (step === 2 && !payload.giftTypeId)
          }
          onClick={() => move(step + 1)}
        >
          Next step
        </button>
      </div>
      {signed && available ? (
        <button
          type="button"
          className="button"
          disabled={busy || conflict}
          onClick={() => {
            setFailed(false);
            void persist();
          }}
        >
          {busy
            ? "Saving..."
            : record
              ? "Save draft now"
              : "Save to my account"}
        </button>
      ) : (
        <p>
          <Link href="/login?next=/build-a-gift">Sign in to save a draft</Link>.
          In-memory edits do not follow you through sign-in; sign in before
          entering personal details.
        </p>
      )}
      <p role="status">
        {record &&
        snapshot !== lastSaved.current &&
        !busy &&
        !failed &&
        !conflict
          ? "Unsaved changes. Autosave will run shortly."
          : status}
      </p>
      {record && (
        <p>
          Saved version {record.version}. Expires{" "}
          {new Date(record.expiresAt).toLocaleDateString()}.
        </p>
      )}
      {conflict && (record || newId.current) && (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => load(record?.id ?? newId.current!)}
        >
          Load latest and keep my edits for comparison
        </button>
      )}
      {comparison && (
        <details open>
          <summary>Your previous in-memory edits for comparison</summary>
          <pre className="safe-json">{JSON.stringify(comparison, null, 2)}</pre>
          <p>
            Apply the changes you want to the current form, then save. This
            comparison is not stored in your browser.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => setComparison(null)}
          >
            Dismiss comparison
          </button>
        </details>
      )}
      <details>
        <summary>Reset or delete this draft</summary>
        <button
          type="button"
          className="button secondary"
          disabled={busy || conflict}
          onClick={() => {
            setPayload({ ...emptyBuilderPayload });
            setStep(1);
            setFailed(false);
            setStatus(
              record
                ? "Fields cleared in memory. Save to persist this reset."
                : "Reset in memory. Nothing saved.",
            );
          }}
        >
          Clear draft fields
        </button>
        {record && (
          <>
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
              />
              Delete this saved draft permanently
            </label>
            <button
              type="button"
              className="button secondary"
              disabled={!confirmDelete || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await privateRequest("/api/builder/drafts", {
                    action: "delete",
                    id: record.id,
                    expectedVersion: record.version,
                  });
                  setDrafts((rows) => rows.filter((r) => r.id !== record.id));
                  setRecord(null);
                  setPayload({ ...emptyBuilderPayload });
                  setStep(1);
                  lastSaved.current = "";
                  newId.current = null;
                  setConflict(false);
                  setFailed(false);
                  setConfirmDelete(false);
                  setStatus("Draft deleted.");
                } catch (e) {
                  setStatus(
                    e instanceof Error
                      ? e.message
                      : "Delete failed; draft retained.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete saved draft
            </button>
          </>
        )}
      </details>
    </section>
  );
}
