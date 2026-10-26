"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { privateRequest } from "@/lib/client-request";
export type PublicReview = {
  key: string;
  slug: string;
  firstName: string;
  rating: number;
  body: string;
  date: string;
  photo: string | null;
};
export type OwnReview = {
  id: string;
  product: string;
  slug: string;
  name: string;
  rating: number;
  body: string;
  firstName: string;
  status: string;
  deleted: boolean;
  version: number;
  photo: string | null;
};
export function Reviews({
  product,
  slug,
  items,
  count,
  average,
  distribution,
}: {
  product: string;
  slug: string;
  items: PublicReview[];
  count: number;
  average: number | null;
  distribution: Record<string, number>;
}) {
  const [own, setOwn] = useState<OwnReview | null>(null),
    [signed, setSigned] = useState(false),
    [status, setStatus] = useState("");
  const [rating, setRating] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    privateRequest<OwnReview[]>("/api/reviews")
      .then((rows) => {
        if (active) {
          setSigned(true);
          const r = rows.find((r) => r.product === product) ?? null;
          setOwn(r);
          setRating(r?.rating ?? null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [product]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await privateRequest("/api/reviews", {
        product,
        expectedVersion: own?.version ?? 0,
        action: "save",
        stars: rating,
        body: f.get("body"),
        firstName: f.get("firstName"),
      });
      setStatus("Review saved for moderation. It will appear after approval.");
      const rows = await privateRequest<OwnReview[]>("/api/reviews");
      setOwn(rows.find((r) => r.product === product) ?? null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Thoughts on this gift</h2>
      <p>
        {count === 0
          ? "Not yet rated"
          : `${Number(average).toFixed(1)}/5 from ${count} reviews`}
      </p>
      {count > 0 && (
        <ul aria-label="Rating distribution">
          {[5, 4, 3, 2, 1, 0].map((n) => (
            <li key={n}>
              {n} stars: {distribution[n] ?? 0}
            </li>
          ))}
        </ul>
      )}
      {items.map((r) => (
        <article className="review-card" key={r.key}>
          <strong>
            {r.firstName} - {r.rating}/5
          </strong>
          <p>
            <time dateTime={r.date}>{r.date}</time>
          </p>
          <p>{r.body}</p>
          {r.photo && (
            <img
              src={r.photo}
              alt="Customer-submitted gift details"
              width={240}
              height={180}
              loading="lazy"
            />
          )}
          <details>
            <summary>Report review</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await privateRequest("/api/reviews/report", {
                    key: r.key,
                    reason: f.get("reason"),
                  });
                  setStatus("Report saved for owner review.");
                } catch (e) {
                  setStatus(
                    e instanceof Error
                      ? e.message
                      : "Please sign in to report.",
                  );
                }
              }}
            >
              <label>
                Reason
                <textarea name="reason" required maxLength={2000} />
              </label>
              <button type="submit" className="button secondary">
                Send report
              </button>
            </form>
          </details>
        </article>
      ))}
      {count > items.length && (
        <p>
          Showing the latest {items.length} reviews.{" "}
          <Link href={`/product/${slug}/reviews`}>Read all reviews</Link>
        </p>
      )}
      {signed ? (
        <form
          onSubmit={submit}
          key={own?.version ?? 0}
          className="enquiry-form"
        >
          <h3>{own ? "Edit your review" : "Share your thoughts"}</h3>
          {own && (
            <p>
              Your review: {own.deleted ? "deleted" : own.status}. Saving an
              edit submits it for approval again.
            </p>
          )}
          <label className="form-field">
            First name only
            <input
              name="firstName"
              defaultValue={own?.firstName}
              maxLength={60}
              required
              pattern="[^\s]+"
            />
          </label>
          <fieldset>
            <legend>Your rating (choose deliberately; zero is valid)</legend>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <label className="check-label" key={n}>
                <input
                  type="radio"
                  name="stars"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  required
                />
                {n} stars
              </label>
            ))}
          </fieldset>
          <label className="form-field">
            Your review
            <textarea
              name="body"
              defaultValue={own?.body}
              required
              maxLength={2000}
            />
          </label>
          <button
            type="submit"
            className="button"
            disabled={busy || rating === null}
          >
            Submit for approval
          </button>
          {own && !own.deleted && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await privateRequest("/api/reviews", {
                    product,
                    expectedVersion: own.version,
                    action: "delete",
                    stars: null,
                    body: "",
                    firstName: "",
                  });
                  setOwn({ ...own, deleted: true, version: own.version + 1 });
                  setStatus("Review removed from publication.");
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : "Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete my review
            </button>
          )}
          {own && !own.deleted && (
            <PhotoUpload
              kind="review"
              parent={own.id}
              onReady={async () => {
                const rows = await privateRequest<OwnReview[]>("/api/reviews");
                setOwn(rows.find((r) => r.product === product) ?? null);
              }}
            />
          )}
        </form>
      ) : (
        <p>
          <Link href="/login?next=/account">Sign in to review this gift</Link>
        </p>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
export function PhotoUpload({
  kind,
  parent,
  onReady,
}: {
  kind: "review" | "enterprise" | "proof";
  parent: string;
  onReady?: () => Promise<void>;
}) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="form-field">
      <label>
        Optional {kind === "enterprise" ? "logo" : "photo"} (JPEG, PNG or WebP,
        up to 2 MiB)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || (kind !== "enterprise" && !consent)}
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const session = await fetch("/api/session", {
                cache: "no-store",
              }).then((r) => r.json());
              const ticket = await privateRequest<{ id: string }>(
                "/api/uploads",
                {
                  kind,
                  parent,
                  bytes: file.size,
                  mime: file.type,
                  consent: kind !== "enterprise" && consent,
                },
              );
              const response = await fetch(`/api/uploads/${ticket.id}`, {
                method: "POST",
                headers: {
                  "Content-Type": file.type,
                  "X-CSRF-Token": session.csrf,
                },
                body: file,
              });
              const d = await response.json();
              if (!response.ok) throw new Error(d.message);
              await onReady?.();
              setStatus(
                "Sanitized image saved privately. Review and proof photos need owner publication approval.",
              );
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Upload failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {kind !== "enterprise" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I consent to public sharing of this redacted image after owner
          approval.
        </label>
      )}
      {kind !== "enterprise" && (
        <p>
          By uploading, you consent to publication of this photo after owner
          moderation. Remove personal details, faces and private messages first.
        </p>
      )}
      <p role="status">{status}</p>
    </div>
  );
}
