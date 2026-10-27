"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { privateRequest, RequestError } from "@/lib/client-request";
import {
  builderPayload,
  normalizeBuilderDraft,
  configurationComplete,
  type BuilderChoice,
  budgetPresets,
  emptyBuilderPayload,
  type BuilderDraft,
  type BuilderPayload,
} from "@/lib/builder-domain";
import { money, type Taxon } from "@/lib/domain";
const steps = [
  "Budget",
  "Gift type",
  "Occasion and recipient",
  "Your words",
  "Colours and add-ons",
  "Photos",
  "Contact and delivery",
  "Review",
];
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
  const [choices, setChoices] = useState<BuilderChoice[]>([]),
    [choiceStatus, setChoiceStatus] = useState("");
  const selected = choices.find((c) => c.id === payload.productId) ?? null;
  const lastStep = available ? 8 : 4;
  useEffect(() => {
    if (!available || !payload.giftTypeId) {
      setChoices([]);
      return;
    }
    const controller = new AbortController();
    setChoices([]);
    setChoiceStatus("Loading published gift configurations...");
    fetch(
      `/api/builder/choices?type=${payload.giftTypeId}${payload.productId ? `&selected=${payload.productId}` : ""}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        setChoices(data);
        setChoiceStatus(
          data.length
            ? ""
            : "No published customizable gifts for this type yet.",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setChoices([]);
          setChoiceStatus(e.message);
        }
      });
    return () => controller.abort();
  }, [available, payload.giftTypeId, payload.productId]);

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
                ...rows
                  .map(normalizeBuilderDraft)
                  .filter((r) => !existing.some((d) => d.id === r.id)),
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
      setFailed(true);
      setStatus(
        "Check the budget, selected gift and contact fields before saving. Your edits remain in this tab.",
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
        schemaVersion: 2,
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
    const normalized = normalizeBuilderDraft(d);
    setRecord(normalized);
    setPayload(normalized.payload);
    setStep(normalized.step);
    lastSaved.current = JSON.stringify({
      payload: normalized.payload,
      step: normalized.step,
    });
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
        Builder development preview: plan a gift using published configurations.
        Saved estimates are provisional. Photo uploads and quote submission are
        not enabled yet. This draft creates no enquiry or order.
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
          {steps.slice(0, lastStep).map((name, i) => (
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
        <>
          <label className="form-field">
            Gift type
            <select
              value={payload.giftTypeId ?? ""}
              onChange={(e) =>
                setPayload((v) => ({
                  ...v,
                  giftTypeId: e.target.value || null,
                  productId: null,
                  pricingVersion: null,
                  options: [],
                }))
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
          {available && (
            <>
              <p aria-live="polite">{choiceStatus}</p>
              <label className="form-field">
                Base gift
                <select
                  value={payload.productId ?? ""}
                  onChange={(e) => {
                    const choice = choices.find((c) => c.id === e.target.value);
                    setPayload((v) => ({
                      ...v,
                      productId: choice?.id ?? null,
                      pricingVersion: choice?.version ?? null,
                      options: [],
                      quantity: Math.max(v.quantity, choice?.moq ?? 1),
                    }));
                  }}
                >
                  <option value="">Choose a published gift</option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - MOQ {c.moq}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Changing the gift clears incompatible colour/add-on selections.
                No photos can be uploaded in this increment.
              </p>
              {selected && payload.pricingVersion !== selected.version && (
                <div className="notice">
                  <p>
                    This gift configuration changed. Review the current options
                    and prices.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setPayload((v) => ({
                        ...v,
                        pricingVersion: selected.version,
                        options: [],
                        quantity: Math.max(v.quantity, selected.moq),
                      }))
                    }
                  >
                    Use reviewed current configuration
                  </button>
                </div>
              )}
            </>
          )}
        </>
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
                if (
                  [...e.target.value].length <=
                    Math.min(500, selected?.messageLimit ?? 500) ||
                  [...e.target.value].length < [...payload.message].length
                )
                  setPayload((v) => ({ ...v, message: e.target.value }));
              }}
            />
          </label>
          {payload.message.length >
            Math.min(500, selected?.messageLimit ?? 500) && (
            <p role="alert">
              Your saved message exceeds this gift's limit. Shorten it or clear
              it before saving.
              <button
                type="button"
                className="button secondary"
                onClick={() => setPayload((v) => ({ ...v, message: "" }))}
              >
                Clear incompatible message
              </button>
            </p>
          )}
          <small>
            {[...payload.message].length}/
            {Math.min(500, selected?.messageLimit ?? 500)} characters
          </small>
          <div className="notice">
            <h3>Illustrative message preview</h3>
            <p>{payload.message || "Your words will appear here."}</p>
            <p>Final handmade layout is confirmed with Memocious.</p>
          </div>
        </>
      )}
      {step === 5 && (
        <>
          <h3>Options for {selected?.name ?? "your selected gift"}</h3>
          {selected?.optionGroups.map((g) => (
            <fieldset key={g.id}>
              <legend>
                {g.label} ({g.required ? "required" : "optional"}; up to{" "}
                {g.maxCount})
              </legend>
              {g.values.map((v) => (
                <label className="check-label" key={v.id}>
                  <input
                    type="checkbox"
                    checked={payload.options.includes(v.id)}
                    disabled={
                      !payload.options.includes(v.id) &&
                      g.values.filter((x) => payload.options.includes(x.id))
                        .length >= g.maxCount
                    }
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        options: e.target.checked
                          ? [...p.options, v.id]
                          : p.options.filter((id) => id !== v.id),
                      }))
                    }
                  />
                  {v.label} -{" "}
                  {v.deltaPaise === 0 ? "included" : `+${money(v.deltaPaise)}`}
                </label>
              ))}
            </fieldset>
          ))}
          {selected?.optionGroups.length === 0 && (
            <p>No colour or add-on choices are configured for this gift.</p>
          )}
        </>
      )}
      {step === 6 && (
        <div className="notice">
          <h3>Private reference photos</h3>
          <p>
            Uploads are not enabled in this development increment. No files are
            collected here.
          </p>
          {selected?.requiresPhotos ? (
            <p>
              This gift requires an image. Further steps are blocked until the
              private upload workflow is available.
            </p>
          ) : (
            <p>You can continue planning a draft without files.</p>
          )}
        </div>
      )}
      {step === 7 && (
        <>
          <label className="form-field">
            Quantity
            <input
              type="number"
              min={selected?.moq ?? 1}
              max={10000}
              value={payload.quantity}
              onChange={(e) =>
                setPayload((v) => ({ ...v, quantity: Number(e.target.value) }))
              }
            />
          </label>
          <label className="form-field">
            Requested date
            <input
              type="date"
              value={payload.requestedDate ?? ""}
              onChange={(e) =>
                setPayload((v) => ({
                  ...v,
                  requestedDate: e.target.value || null,
                }))
              }
            />
          </label>
          <p>
            Preparation:{" "}
            {selected?.leadDays === null
              ? "confirm with Memocious"
              : `${selected?.leadDays ?? 0} days`}
            . Requested dates remain subject to owner confirmation.
          </p>
          {(
            [
              ["name", "Contact name", 120],
              ["phone", "Phone with country code", 20],
              ["email", "Email (optional)", 254],
              ["city", "City", 120],
              ["pincode", "Pincode", 6],
            ] as const
          ).map(([key, label, max]) => (
            <label key={key} className="form-field">
              {label}
              <input
                value={payload.contact[key]}
                maxLength={max}
                onChange={(e) =>
                  setPayload((v) => ({
                    ...v,
                    contact: { ...v.contact, [key]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </>
      )}
      {step === 8 && (
        <>
          <h3>Review your plan</h3>
          <p>
            {selected?.name} - quantity {payload.quantity}
          </p>
          <p>{payload.message}</p>
          <p>
            {payload.contact.name}, {payload.contact.city}{" "}
            {payload.contact.pincode}; requested {payload.requestedDate}
          </p>
          <p>
            Save this reviewed draft to validate contact, quantity, date and
            current options. This does not submit an enquiry.
          </p>
          <button type="button" className="button" disabled>
            Quote submission is not enabled yet
          </button>
        </>
      )}
      {record?.estimate && (
        <div className="notice">
          <h3>Last saved estimate</h3>
          {record.estimate.status === "changed" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => move(2)}
            >
              Review current gift configuration
            </button>
          )}
          {record.estimate.status === "provisional" &&
          record.estimate.minPaise !== null ? (
            <p>
              {record.estimate.maxPaise === null
                ? `Starting estimate ${money(record.estimate.minPaise)}; no upper estimate supplied.`
                : `${money(record.estimate.minPaise)} to ${money(record.estimate.maxPaise)}`}
            </p>
          ) : (
            <p>
              {record.estimate.status === "changed"
                ? "Pricing changed. Review the gift configuration before saving again."
                : "An owner quotation is needed; no supported estimate is available."}
            </p>
          )}
          <p>
            Provisional gift estimate only. Customisation, shipping and final
            price need owner confirmation. Unsaved changes are not reflected.
          </p>
        </div>
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
            step === lastStep ||
            (step === 1 && !budgetValid) ||
            (step === 2 &&
              (!payload.giftTypeId || (available && !payload.productId))) ||
            (step === 5 && !configurationComplete(payload, selected)) ||
            (step === 6 && !!selected?.requiresPhotos)
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
