"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { privateRequest } from "@/lib/client-request";
import { PhotoUpload } from "./reviews";
import type { OwnReview } from "./reviews";
type Address = {
  id: string;
  version: number;
  label: string;
  fullName: string;
  lines: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
};
export function AccountPhase2() {
  const [enterprise, setEnterprise] = useState<
    {
      id: string;
      code: string;
      organization: string;
      pipeline: string;
      assets: string[];
    }[]
  >([]);
  const [addresses, setAddresses] = useState<Address[]>([]),
    [reviews, setReviews] = useState<OwnReview[]>([]),
    [editing, setEditing] = useState<Address | null>(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    privateRequest<typeof enterprise>("/api/inquiries")
      .then(setEnterprise)
      .catch((e) => setStatus(e.message));
    Promise.all([
      privateRequest<Address[]>("/api/addresses"),
      privateRequest<OwnReview[]>("/api/reviews"),
    ])
      .then(([a, r]) => {
        if (active) {
          setAddresses(a);
          setReviews(r);
        }
      })
      .catch((e) => {
        if (active) setStatus(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <section>
        <h2>My enterprise enquiries</h2>
        {enterprise.map((e) => (
          <article key={e.id}>
            <h3>
              {e.code} - {e.organization}
            </h3>
            <p>{e.pipeline}</p>
            {e.assets.map((id) => (
              <img
                key={id}
                src={`/api/uploads/${id}`}
                width={240}
                height={180}
                alt="Your private branding"
              />
            ))}
            <PhotoUpload kind="enterprise" parent={e.id} />
          </article>
        ))}
      </section>
      <section>
        <h2>My reviews</h2>
        <p>
          Your latest 200 reviews. Older review data is included in your account
          export.
        </p>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <ul>
            {reviews.map((r) => (
              <li key={r.id}>
                <Link href={`/product/${r.slug}#reviews-heading`}>
                  {r.name}
                </Link>
                : {r.rating}/5 - {r.deleted ? "deleted" : r.status}. {r.body}
                {!r.deleted && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await privateRequest("/api/reviews", {
                          product: r.product,
                          expectedVersion: r.version,
                          action: "delete",
                          stars: null,
                          body: "",
                          firstName: "",
                        });
                        setReviews(
                          await privateRequest<OwnReview[]>("/api/reviews"),
                        );
                        setStatus("Review removed from publication.");
                      } catch (e) {
                        setStatus(
                          e instanceof Error ? e.message : "Try again.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete this review
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Saved addresses</h2>
        {addresses.map((a) => (
          <article key={a.id}>
            <h3>{a.label}</h3>
            <p>
              {a.fullName}, {a.lines}, {a.city}, {a.state} {a.pincode}, +
              {a.phone}
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(a)}
            >
              Edit
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setAddresses(
                    await privateRequest<Address[]>("/api/addresses", {
                      action: "delete",
                      id: a.id,
                      expectedVersion: a.version,
                    }),
                  );
                  setStatus("Address removed.");
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : "Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove
            </button>
          </article>
        ))}
        <form
          key={editing?.id ?? "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const fields = Object.fromEntries(f.entries());
            setBusy(true);
            try {
              setAddresses(
                await privateRequest<Address[]>("/api/addresses", {
                  action: "save",
                  id: editing?.id ?? null,
                  expectedVersion: editing?.version ?? null,
                  fields,
                }),
              );
              setEditing(null);
              form.reset();
              setStatus("Address saved.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{editing ? "Edit address" : "Add address"}</h3>
          {(
            [
              ["label", "Label", 60],
              ["fullName", "Full name", 120],
              ["lines", "Address lines", 500],
              ["city", "City", 120],
              ["state", "State", 120],
              ["pincode", "Pincode", 6],
              ["phone", "Phone with country code", 20],
            ] as const
          ).map(([name, label, max]) => (
            <label className="form-field" key={name}>
              {label}
              <input
                name={name}
                defaultValue={editing?.[name]}
                maxLength={max}
                required
                autoComplete={
                  name === "pincode"
                    ? "postal-code"
                    : name === "phone"
                      ? "tel"
                      : "off"
                }
              />
            </label>
          ))}
          <button type="submit" className="button" disabled={busy}>
            Save address
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Cancel edit
            </button>
          )}
        </form>
      </section>
      <section>
        <h2>Your data</h2>
        <p>
          For export or deletion requests, sign out and sign in again within the
          last 10 minutes.
        </p>
        <p>
          Export your profile and current account records. A deletion request is
          reviewed by the owner; legally required enquiry and transaction
          history may need to be retained.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const data = await privateRequest("/api/privacy", {
                action: "export",
              });
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "memocious-account.json";
              a.click();
              URL.revokeObjectURL(url);
              setStatus("Account export downloaded.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Download my data
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const d = await privateRequest<{ message: string }>(
                "/api/privacy",
                { action: "delete-request" },
              );
              setStatus(d.message);
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="check-label">
            <input type="checkbox" required />I request deletion after
            legal-retention review.
          </label>
          <button type="submit" className="button secondary" disabled={busy}>
            Request account deletion
          </button>
        </form>
      </section>
      <p role="status">{status}</p>
    </>
  );
}
