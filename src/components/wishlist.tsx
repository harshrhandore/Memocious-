"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Item = { id: string; slug: string; name: string };
export function Wishlist({ product }: { product?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/wishlist", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setLogin(true);
          return;
        }
        if (!r.ok) throw new Error("Wishlist is temporarily unavailable.");
        setItems(await r.json());
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus("Wishlist is temporarily unavailable.");
      });
    return () => controller.abort();
  }, []);
  async function change(id: string, saved: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const session = await fetch("/api/session", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const r = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: JSON.stringify({ product: id, saved }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Please try again.");
      setItems(data);
      setStatus(
        saved ? "Saved to your wishlist." : "Removed from your wishlist.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const saved = items?.some((i) => i.id === product) ?? false;
  return (
    <section aria-label="Wishlist">
      {!product && <h2>Your wishlist</h2>}
      {login ? (
        <Link href="/login?next=/account">Sign in to save gifts</Link>
      ) : product ? (
        <button
          type="button"
          className="button secondary"
          disabled={busy || items === null}
          aria-pressed={saved}
          onClick={() => change(product, !saved)}
        >
          {saved ? "Remove from wishlist" : "Save to wishlist"}
        </button>
      ) : items === null ? (
        <p>{status ? "Please reload to try again." : "Loading wishlist..."}</p>
      ) : items.length === 0 ? (
        <p>
          No available gifts saved yet.{" "}
          <Link href="/shop">Browse the collection</Link>
        </p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/product/${i.slug}`}>{i.name}</Link>{" "}
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                aria-label={`Remove ${i.name} from wishlist`}
                onClick={() => change(i.id, false)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
