"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountForm({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  async function request(path: string, body: unknown) {
    try {
      const s = await fetch("/api/session", { cache: "no-store" }).then((r) =>
        r.json(),
      );
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setStatus("Saved.");
      return true;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Please try again.");
      return false;
    }
  }
  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await request("/api/profile", {
            fullName: new FormData(e.currentTarget).get("fullName"),
          });
        }}
      >
        <div className="form-field">
          <label htmlFor="fullName">Your name</label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            maxLength={120}
            autoComplete="name"
          />
        </div>
        <button type="submit" className="button full">
          Save your name
        </button>
      </form>
      <div className="inline-actions">
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            if (await request("/api/auth/logout", { everywhere: false })) {
              router.replace("/login");
              router.refresh();
            }
          }}
        >
          Sign out
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            if (await request("/api/auth/logout", { everywhere: true })) {
              router.replace("/login");
              router.refresh();
            }
          }}
        >
          Sign out everywhere
        </button>
      </div>
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
    </>
  );
}
