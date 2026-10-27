"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  AdminProduct,
  AdminTaxon,
  AdminSettings,
  ProductFields,
} from "@/lib/admin-domain";
import { productFieldsSchema } from "@/lib/admin-domain";
import { money } from "@/lib/domain";
type Workspace = {
  products: AdminProduct[];
  total: number;
  taxonomy: AdminTaxon[];
  settings: AdminSettings;
};
type Send = (
  path: string,
  body: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
const blank: AdminProduct = {
  id: "",
  version: 1,
  name: "",
  slug: "",
  description: "",
  detail: "",
  pricePaise: null,
  maxPricePaise: null,
  materials: "",
  dimensions: "",
  colour: "cream",
  lead: "made-to-order",
  leadDays: null,
  moq: 1,
  enterprise: false,
  customizable: true,
  featured: false,
  inStock: true,
  active: false,
  deleted: false,
  publicationState: "draft",
  seoTitle: "",
  seoDescription: "",
  messageLimit: 500,
  categories: [],
  occasions: [],
  options: [],
  images: [],
};
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      aria-label={title}
      onClose={onClose}
    >
      <div className="studio-dialog-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="button secondary"
          onClick={() => ref.current?.close()}
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function AdminWorkspace({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const loadSequence = useRef(0);
  const [data, setData] = useState<Workspace | null>(null),
    [page, setPage] = useState(1),
    [tab, setTab] = useState("products"),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState<AdminProduct | null>(null),
    [taxon, setTaxon] = useState<AdminTaxon | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [plan, setPlan] = useState<{
    count: number;
    digest: string;
    mode: "soft" | "permanent";
    ids: string[] | null;
  } | null>(null);
  const send: Send = useCallback(async (path, body) => {
    const session = await fetch("/api/session", { cache: "no-store" }).then(
      (r) => r.json(),
    );
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrf,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "Please try again.");
    return result;
  }, []);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    await fetch("/api/session", { cache: "no-store" });
    const r = await fetch(`/api/admin/workspace?page=${page}`, {
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
    if (sequence !== loadSequence.current) return;
    setData(d);
    setSelected([]);
  }, [page]);
  useEffect(() => {
    load().catch((e) => setStatus(e.message));
  }, [load]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function mutate(p: AdminProduct, action: string) {
    await send("/api/admin/products", {
      productId: p.id,
      version: p.version,
      action,
      fields: {},
    });
    await load();
  }
  async function deletion(ids: string[] | null, mode: "soft" | "permanent") {
    await act(async () => {
      const p = await send("/api/admin/delete", {
        ids,
        mode,
        digest: null,
        confirmation: null,
      });
      setPlan({ count: Number(p.count), digest: String(p.digest), ids, mode });
    });
  }
  return (
    <section className="studio">
      <nav className="studio-tabs" aria-label="Studio sections">
        {["products", "taxonomy", "settings"].map((t) => (
          <button
            type="button"
            key={t}
            className={`button ${tab === t ? "" : "secondary"}`}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => act(load)}
        >
          Refresh
        </button>
        {!embedded && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await send("/api/auth/logout", { everywhere: false });
                window.location.reload();
              })
            }
          >
            Sign out
          </button>
        )}
      </nav>
      <p className="notice">
        Drafts and new photographs remain private until you explicitly publish
        them. Deletion and contact settings require owner verification within
        the last five minutes.{" "}
        {embedded
          ? "Open Security to verify again."
          : "Use the authenticator section below to verify again."}
      </p>
      {status && (
        <p className="notice error my-4" role="alert">
          {status}
        </p>
      )}
      {!data ? (
        <p role="status">Loading the protected workspace…</p>
      ) : tab === "products" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 my-5">
            <h2 className="mr-auto">Products ({data.total})</h2>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setEditor({ ...blank })}
            >
              Add product
            </button>
          </div>
          <div className="flex flex-wrap gap-3 my-4">
            <button
              type="button"
              className="button secondary"
              disabled={busy || !selected.length}
              onClick={() => deletion(selected, "soft")}
            >
              Soft-delete selected ({selected.length})
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy || !selected.length}
              onClick={() => deletion(selected, "permanent")}
            >
              Permanently delete selected
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => deletion(null, "soft")}
            >
              Soft-delete all…
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => deletion(null, "permanent")}
            >
              Permanently delete all soft-deleted…
            </button>
          </div>
          {data.products.length ? (
            data.products.map((p) => (
              <article className="studio-product" key={p.id}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, p.id]
                          : ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <strong>{p.name}</strong>
                </label>
                <p>
                  {p.pricePaise === null
                    ? "Quote required"
                    : money(p.pricePaise)}{" "}
                  ·{" "}
                  {p.deleted
                    ? "Soft-deleted"
                    : p.active
                      ? "Published"
                      : "Private / hidden"}{" "}
                  · Version {p.version}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || p.deleted}
                    onClick={() => setEditor(p)}
                  >
                    Edit details &amp; media
                  </button>
                  {!p.deleted &&
                    ["duplicate", p.active ? "hide" : "show"].map((action) => (
                      <button
                        type="button"
                        key={action}
                        className="button secondary"
                        disabled={busy}
                        onClick={() => act(() => mutate(p, action))}
                      >
                        {action === "show"
                          ? "Publish product"
                          : action === "hide"
                            ? "Hide"
                            : "Duplicate as draft"}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      deletion([p.id], p.deleted ? "permanent" : "soft")
                    }
                  >
                    {p.deleted ? "Permanently delete…" : "Soft-delete…"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p>No products yet. Add a private draft to begin.</p>
          )}
          <nav
            className="flex items-center gap-4 my-6"
            aria-label="Product pages"
          >
            <button
              type="button"
              className="button secondary"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(data.total / 24))}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={page * 24 >= data.total || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        </>
      ) : tab === "taxonomy" ? (
        <>
          <h2>Categories &amp; occasions</h2>
          <div className="flex gap-3 my-5">
            {["category", "occasion"].map((kind) => (
              <button
                type="button"
                className="button"
                key={kind}
                onClick={() =>
                  setTaxon({
                    kind: kind as "category" | "occasion",
                    id: null,
                    version: 1,
                    label: "",
                    slug: "",
                    parentId: null,
                    sortOrder: 0,
                    active: true,
                  })
                }
              >
                Add {kind}
              </button>
            ))}
          </div>
          {data.taxonomy.map((t) => (
            <article className="studio-product" key={t.id}>
              <h3>{t.label}</h3>
              <p>
                {t.kind} · {t.active ? "Active" : "Hidden"} · Position{" "}
                {t.sortOrder}
                {t.parentId
                  ? ` · Parent: ${data.taxonomy.find((p) => p.id === t.parentId)?.label}`
                  : ""}
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={() => setTaxon(t)}
              >
                Rename, reorder or hide
              </button>
            </article>
          ))}
        </>
      ) : (
        <Settings
          initial={data.settings}
          busy={busy}
          save={(fields) =>
            act(async () => {
              await send("/api/admin/settings", fields);
              await load();
              setStatus("Settings saved.");
            })
          }
        />
      )}
      {editor && data && (
        <Dialog
          title={editor.id ? `Edit ${editor.name}` : "Add a private product"}
          onClose={() => setEditor(null)}
        >
          <ProductEditor
            key={editor.id + ":" + editor.version}
            product={editor}
            taxonomy={data.taxonomy}
            busy={busy}
            send={send}
            save={(fields) =>
              act(async () => {
                const result = await send("/api/admin/products", {
                  productId: editor.id || null,
                  version: editor.version,
                  action: editor.id ? "edit" : "create",
                  fields,
                });
                await load();
                setEditor(null);
                setStatus(
                  `Product saved as ${String(result.id)}. Publish only after reviewing its media.`,
                );
              })
            }
            mediaChanged={() =>
              act(async () => {
                await load();
                setEditor(null);
                setStatus(
                  "Media saved. Reopen the product to continue with its current version.",
                );
              })
            }
          />
          {status && (
            <p className="notice error" role="alert">
              {status}
            </p>
          )}
        </Dialog>
      )}
      {taxon && data && (
        <Dialog title={`Edit ${taxon.kind}`} onClose={() => setTaxon(null)}>
          <TaxonomyEditor
            item={taxon}
            taxonomy={data.taxonomy}
            busy={busy}
            save={(fields) =>
              act(async () => {
                await send("/api/admin/taxonomy", fields);
                await load();
                setTaxon(null);
              })
            }
          />
          {status && (
            <p className="notice error" role="alert">
              {status}
            </p>
          )}
        </Dialog>
      )}
      {plan && (
        <Dialog title="Review deletion" onClose={() => setPlan(null)}>
          <p>
            {plan.mode === "permanent" ? "Permanently delete" : "Soft-delete"}{" "}
            exactly{" "}
            <strong>
              {plan.count}{" "}
              {plan.mode === "permanent" ? "already soft-deleted " : ""}products
            </strong>
            . Historical order snapshots and audit records stay intact.{" "}
            {plan.mode === "permanent"
              ? "This cannot be undone."
              : "These products will be hidden."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(async () => {
                await send("/api/admin/delete", {
                  ids: plan.ids,
                  mode: plan.mode,
                  digest: plan.digest,
                  confirmation: f.get("confirmation"),
                });
                setPlan(null);
                await load();
                setStatus("Deletion completed.");
              });
            }}
          >
            <div className="form-field">
              <label htmlFor="delete-confirm">Type DELETE {plan.count}</label>
              <input
                id="delete-confirm"
                name="confirmation"
                autoComplete="off"
                required
                pattern={`DELETE ${plan.count}`}
              />
            </div>
            <button
              type="submit"
              className="button"
              disabled={busy || plan.count === 0}
            >
              Confirm{" "}
              {plan.mode === "permanent"
                ? "permanent deletion"
                : "soft deletion"}
            </button>
            <button
              type="button"
              className="button secondary ml-3"
              onClick={() => setPlan(null)}
            >
              Cancel
            </button>
          </form>
          {status && (
            <p className="notice error" role="alert">
              {status}
            </p>
          )}
        </Dialog>
      )}
    </section>
  );
}
function withOptionKeys(o: NonNullable<ProductFields["options"]>[number]) {
  return {
    ...o,
    _key: crypto.randomUUID(),
    values: o.values.map((v) => ({ ...v, _key: crypto.randomUUID() })),
  };
}
function ProductEditor({
  product: p,
  taxonomy,
  busy,
  save,
  send,
  mediaChanged,
}: {
  product: AdminProduct;
  taxonomy: AdminTaxon[];
  busy: boolean;
  save: (fields: ProductFields) => void;
  send: Send;
  mediaChanged: () => void;
}) {
  const [options, setOptions] = useState(() =>
      (p.options ?? []).map(withOptionKeys),
    ),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const textFields: [keyof ProductFields, string, number][] = [
    ["name", "Name", 120],
    ["slug", "URL slug", 80],
    ["materials", "Materials", 500],
    ["dimensions", "Dimensions", 300],
    ["seoTitle", "SEO title", 70],
    ["seoDescription", "SEO description", 160],
  ];
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const fields: Record<string, unknown> = {};
          for (const [key] of textFields)
            fields[key] = String(f.get(key) ?? "");
          for (const key of ["description", "detail", "colour", "lead"])
            fields[key] = f.get(key);
          for (const key of [
            "customizable",
            "featured",
            "inStock",
            "enterprise",
          ])
            fields[key] = f.get(key) === "on";
          for (const key of ["pricePaise", "maxPricePaise"])
            fields[key] = f.get(key)
              ? Math.round(Number(f.get(key)) * 100)
              : null;
          for (const key of ["leadDays", "moq"])
            fields[key] = f.get(key) ? Number(f.get(key)) : null;
          fields.messageLimit = Number(f.get("messageLimit"));
          fields.categories = f.getAll("categories");
          fields.occasions = f.getAll("occasions");
          fields.options = options.map(({ _key, values, ...o }) => ({
            ...o,
            values: values.map(({ _key, ...v }) => v),
          }));
          const checked = productFieldsSchema.safeParse(fields);
          if (!checked.success) {
            setError(checked.error.issues[0].message);
            return;
          }
          setError("");
          save(checked.data);
        }}
      >
        <div className="studio-grid">
          {textFields.map(([key, label, max]) => (
            <div className="form-field" key={key}>
              <label htmlFor={`edit-${key}`}>{label}</label>
              <input
                id={`edit-${key}`}
                name={key}
                maxLength={max}
                required={key === "name" || key === "slug"}
                defaultValue={String(p[key] ?? "")}
                pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
              />
            </div>
          ))}
        </div>
        {[
          ["description", "Short description", 500],
          ["detail", "Product details", 10000],
        ].map(([key, label, max]) => (
          <div className="form-field" key={key}>
            <label htmlFor={`edit-${key}`}>{label}</label>
            <textarea
              id={`edit-${key}`}
              name={String(key)}
              maxLength={Number(max)}
              rows={4}
              defaultValue={String(p[key as keyof AdminProduct] ?? "")}
            />
          </div>
        ))}
        <div className="studio-grid">
          {[
            ["pricePaise", "From price in ₹"],
            ["maxPricePaise", "Maximum price in ₹"],
          ].map(([key, label]) => (
            <div className="form-field" key={key}>
              <label htmlFor={`edit-${key}`}>{label}</label>
              <input
                type="number"
                id={`edit-${key}`}
                name={key}
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={
                  p[key as "pricePaise"] == null
                    ? ""
                    : Number(p[key as "pricePaise"]) / 100
                }
              />
              <small>
                Blank means quote required. Zero is a real zero price.
              </small>
            </div>
          ))}
          {[
            ["leadDays", "Making time in working days", 365],
            ["moq", "Minimum quantity", 10000],
            ["messageLimit", "Personal message character limit", 500],
          ].map(([key, label, max]) => (
            <div className="form-field" key={key}>
              <label htmlFor={`edit-${key}`}>{label}</label>
              <input
                type="number"
                id={`edit-${key}`}
                name={String(key)}
                min={key === "moq" ? 1 : 0}
                max={Number(max)}
                defaultValue={Number(
                  p[key as "moq"] ?? (key === "messageLimit" ? 500 : 0),
                )}
                required={key === "messageLimit"}
              />
            </div>
          ))}
          <div className="form-field">
            <label htmlFor="edit-colour">Colour</label>
            <select id="edit-colour" name="colour" defaultValue={p.colour}>
              {["rose", "cream", "gold", "green", "lavender"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="edit-lead">Availability type</label>
            <select id="edit-lead" name="lead" defaultValue={p.lead}>
              <option value="ready">Ready</option>
              <option value="made-to-order">Made to order</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 my-4">
          {[
            ["customizable", "Customizable"],
            ["featured", "Featured"],
            ["inStock", "Available for enquiry"],
            ["enterprise", "Enterprise / bulk"],
          ].map(([key, label]) => (
            <label className="check-label" key={key}>
              <input
                type="checkbox"
                name={key}
                defaultChecked={!!p[key as "featured"]}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="studio-grid">
          {["category", "occasion"].map((kind) => (
            <fieldset key={kind}>
              <legend>
                {kind === "category"
                  ? "Categories (at least one)"
                  : "Occasions"}
              </legend>
              <div className="studio-checks">
                {taxonomy
                  .filter((t) => t.kind === kind)
                  .map((t) => (
                    <label key={t.id} className="check-label">
                      <input
                        type="checkbox"
                        name={kind === "category" ? "categories" : "occasions"}
                        value={t.id ?? ""}
                        defaultChecked={(kind === "category"
                          ? p.categories
                          : p.occasions
                        )?.includes(t.id ?? "")}
                      />
                      {t.label}
                      {!t.active ? " (hidden)" : ""}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
        <h3>Options and add-ons</h3>
        <p>
          Each group has priced choices. Replacing options invalidates old
          unsubmitted selections; saved enquiry snapshots remain intact.
        </p>
        {options.map((o, i) => (
          <fieldset className="studio-option" key={o._key}>
            <legend>Option group {i + 1}</legend>
            <div className="studio-grid">
              <div className="form-field">
                <label htmlFor={`option-label-${i}`}>Label</label>
                <input
                  id={`option-label-${i}`}
                  value={o.label}
                  maxLength={120}
                  required
                  onChange={(e) =>
                    setOptions(
                      options.map((x, n) =>
                        n === i ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor={`option-kind-${i}`}>Type</label>
                <select
                  id={`option-kind-${i}`}
                  value={o.kind}
                  onChange={(e) =>
                    setOptions(
                      options.map((x, n) =>
                        n === i
                          ? { ...x, kind: e.target.value as "colour" }
                          : x,
                      ),
                    )
                  }
                >
                  {["colour", "size", "addon"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor={`option-count-${i}`}>Maximum choices</label>
                <input
                  id={`option-count-${i}`}
                  type="number"
                  min="1"
                  max="20"
                  value={o.maxCount}
                  onChange={(e) =>
                    setOptions(
                      options.map((x, n) =>
                        n === i
                          ? { ...x, maxCount: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={o.required}
                onChange={(e) =>
                  setOptions(
                    options.map((x, n) =>
                      n === i ? { ...x, required: e.target.checked } : x,
                    ),
                  )
                }
              />
              Selection required
            </label>
            {o.values.map((v, j) => (
              <div className="studio-grid" key={v._key}>
                <div className="form-field">
                  <label htmlFor={`value-${i}-${j}`}>Choice {j + 1}</label>
                  <input
                    id={`value-${i}-${j}`}
                    value={v.label}
                    required
                    maxLength={120}
                    onChange={(e) =>
                      setOptions(
                        options.map((x, n) =>
                          n === i
                            ? {
                                ...x,
                                values: x.values.map((y, k) =>
                                  k === j ? { ...y, label: e.target.value } : y,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`delta-${i}-${j}`}>Added price in ₹</label>
                  <input
                    id={`delta-${i}-${j}`}
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={v.deltaPaise / 100}
                    onChange={(e) =>
                      setOptions(
                        options.map((x, n) =>
                          n === i
                            ? {
                                ...x,
                                values: x.values.map((y, k) =>
                                  k === j
                                    ? {
                                        ...y,
                                        deltaPaise: Math.round(
                                          Number(e.target.value) * 100,
                                        ),
                                      }
                                    : y,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={o.values.length === 1}
                  onClick={() =>
                    setOptions(
                      options.map((x, n) =>
                        n === i
                          ? { ...x, values: x.values.filter((_, k) => k !== j) }
                          : x,
                      ),
                    )
                  }
                >
                  Remove choice {j + 1}
                </button>
              </div>
            ))}
            <div className="flex gap-3 my-4">
              <button
                type="button"
                className="button secondary"
                disabled={o.values.length >= 20}
                onClick={() =>
                  setOptions(
                    options.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            values: [
                              ...x.values,
                              {
                                label: "",
                                deltaPaise: 0,
                                _key: crypto.randomUUID(),
                              },
                            ],
                          }
                        : x,
                    ),
                  )
                }
              >
                Add choice
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setOptions(options.filter((_, n) => n !== i))}
              >
                Remove group
              </button>
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary my-4"
          disabled={options.length >= 10}
          onClick={() =>
            setOptions([
              ...options,
              withOptionKeys({
                label: "",
                kind: "addon",
                required: false,
                maxCount: 1,
                values: [{ label: "", deltaPaise: 0 }],
              }),
            ])
          }
        >
          Add option group
        </button>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="studio-save">
          <button type="submit" className="button" disabled={busy || uploading}>
            {busy ? "Saving…" : "Save product details"}
          </button>
        </div>
      </form>
      {p.id ? (
        <section className="mt-8">
          <h3>Private product photographs</h3>
          <p>
            Save detail edits before working on photographs. Up to ten still
            images per product, 2 MiB each, 20 megapixels. A processed photo
            needs explicit publication before the product can be published.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const file = f.get("image") as File;
              if (!file || file.size > 2097152) {
                setError("Choose a JPEG, PNG or WebP no larger than 2 MiB.");
                return;
              }
              setUploading(true);
              setError("");
              try {
                const ticket = await send("/api/admin/media", {
                  productId: p.id,
                  bytes: file.size,
                  alt: f.get("alt"),
                });
                const session = await fetch("/api/session", {
                  cache: "no-store",
                }).then((r) => r.json());
                const r = await fetch(`/api/admin/media/${ticket.id}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": file.type,
                    "X-CSRF-Token": session.csrf,
                  },
                  body: file,
                });
                const result = await r.json();
                if (!r.ok) throw new Error(result.message);
                mediaChanged();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Upload unavailable.",
                );
              } finally {
                setUploading(false);
              }
            }}
          >
            <div className="form-field">
              <label htmlFor="media-file">Photograph</label>
              <input
                id="media-file"
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="media-alt">Describe the photograph</label>
              <input id="media-alt" name="alt" maxLength={300} required />
            </div>
            <button
              type="submit"
              className="button secondary"
              disabled={busy || uploading}
            >
              {uploading
                ? "Uploading and checking image…"
                : "Upload to private staging"}
            </button>
          </form>
          {p.images.map((img) => (
            <form
              key={img.id}
              className="studio-option"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setUploading(true);
                setError("");
                try {
                  await send(`/api/admin/media/${img.id}`, {
                    version: p.version,
                    operation: f.get("operation"),
                    alt: f.get("alt"),
                    position: Number(f.get("position")),
                  });
                  mediaChanged();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Image unavailable.",
                  );
                } finally {
                  setUploading(false);
                }
              }}
            >
              <Image
                src={`/api/admin/media/${img.id}`}
                alt={img.alt}
                width={150}
                height={150}
                unoptimized
              />
              <p>
                {img.published
                  ? "Approved for publication"
                  : "Private — awaiting review"}
              </p>
              <div className="form-field">
                <label htmlFor={`alt-${img.id}`}>Alt text</label>
                <input
                  id={`alt-${img.id}`}
                  name="alt"
                  defaultValue={img.alt}
                  maxLength={300}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor={`position-${img.id}`}>
                  Position (zero first)
                </label>
                <input
                  id={`position-${img.id}`}
                  name="position"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={img.sortOrder}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor={`operation-${img.id}`}>Action</label>
                <select
                  id={`operation-${img.id}`}
                  name="operation"
                  defaultValue="edit"
                >
                  <option value="edit">Save alt text and position</option>
                  <option value="publish">
                    Approve sanitized image for publication
                  </option>
                  <option value="unpublish">Make private</option>
                  <option value="remove">Remove image</option>
                </select>
              </div>
              <button
                type="submit"
                className="button secondary"
                disabled={busy || uploading}
              >
                Apply image action
              </button>
            </form>
          ))}
        </section>
      ) : (
        <p className="notice">
          Save this private draft first, then reopen it to upload photographs.
        </p>
      )}
    </>
  );
}
function TaxonomyEditor({
  item,
  taxonomy,
  busy,
  save,
}: {
  item: AdminTaxon;
  taxonomy: AdminTaxon[];
  busy: boolean;
  save: (fields: Record<string, unknown>) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          ...item,
          label: f.get("label"),
          slug: f.get("slug"),
          parentId: f.get("parent") || null,
          sortOrder: Number(f.get("position")),
          active: f.get("active") === "on",
        });
      }}
    >
      {[
        ["label", "Name"],
        ["slug", "URL slug"],
      ].map(([name, label]) => (
        <div className="form-field" key={name}>
          <label htmlFor={`taxon-${name}`}>{label}</label>
          <input
            id={`taxon-${name}`}
            name={name}
            defaultValue={item[name as "label"]}
            maxLength={name === "slug" ? 80 : 120}
            pattern={name === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
            required
          />
        </div>
      ))}
      <div className="form-field">
        <label htmlFor="taxon-parent">Parent</label>
        <select
          id="taxon-parent"
          name="parent"
          defaultValue={item.parentId ?? ""}
        >
          <option value="">Top level</option>
          {taxonomy
            .filter((t) => t.kind === item.kind && t.id !== item.id)
            .map((t) => (
              <option key={t.id} value={t.id ?? ""}>
                {t.label}
              </option>
            ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="taxon-position">Position</label>
        <input
          id="taxon-position"
          name="position"
          type="number"
          min="0"
          max="10000"
          defaultValue={item.sortOrder}
        />
      </div>
      <label className="check-label">
        <input name="active" type="checkbox" defaultChecked={item.active} />
        Active (hiding a parent also hides its children)
      </label>
      <button type="submit" className="button" disabled={busy}>
        Save taxonomy
      </button>
    </form>
  );
}
function Settings({
  initial,
  busy,
  save,
}: {
  initial: AdminSettings;
  busy: boolean;
  save: (fields: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="max-w-2xl my-6"
      key={JSON.stringify(initial)}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          brand: f.get("brand"),
          tagline: f.get("tagline"),
          contactEmail: f.get("contactEmail"),
          whatsappNumber: f.get("whatsappNumber") || null,
          requireLogin: f.get("requireLogin") === "on",
        });
      }}
    >
      <h2>Brand &amp; contact settings</h2>
      {[
        ["brand", "Brand name", 80],
        ["tagline", "Tagline", 160],
        ["contactEmail", "Monitored contact email (optional)", 254],
        [
          "whatsappNumber",
          "WhatsApp international digits (country code, no plus)",
          15,
        ],
      ].map(([key, label, max]) => (
        <div className="form-field" key={key}>
          <label htmlFor={`setting-${key}`}>{label}</label>
          <input
            id={`setting-${key}`}
            name={String(key)}
            type={key === "contactEmail" ? "email" : "text"}
            maxLength={Number(max)}
            required={key === "brand"}
            defaultValue={String(initial[key as "brand"] ?? "")}
          />
        </div>
      ))}
      <label className="check-label">
        <input
          name="requireLogin"
          type="checkbox"
          defaultChecked={initial.requireLogin}
        />
        Require customer sign-in before browsing
      </label>
      <p>
        Requiring sign-in removes catalogue access for search engines and public
        provider-token reads. Customer sign-in must work before you enable it.
      </p>
      <button type="submit" className="button" disabled={busy}>
        Save owner settings
      </button>
    </form>
  );
}
