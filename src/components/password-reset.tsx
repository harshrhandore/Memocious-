"use client";
import { useState } from "react";

export function PasswordReset() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return <form onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirmation")) { setMessage("Passwords do not match."); return; }
    const token = new URLSearchParams(location.hash.slice(1)).get("token_hash") || new URLSearchParams(location.search).get("token_hash");
    if (!token) { setMessage("Open the password recovery link from your email. A new recovery email is needed if the link has expired."); return; }
    history.replaceState(null, "", location.pathname);
    setBusy(true);
    try {
      const sessionResponse = await fetch("/api/session", { cache: "no-store" });
      if (!sessionResponse.ok) throw new Error("Recovery is temporarily unavailable.");
      const session = await sessionResponse.json();
      const code = String(form.get("code") || "").trim();
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf }, body: JSON.stringify({ token, password, ...(code ? { code } : {}) }) });
      const data = await response.json();
      setMessage(data.message || "Recovery could not be completed.");
      if (response.ok) setDone(true);
    } catch { setMessage("Recovery could not be completed. Request a new recovery link and try again."); }
    finally { setBusy(false); }
  }}>
    <p>Choose a new password of at least 12 characters. Your authenticator is still required for administrator access.</p>
    <div className="form-field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required disabled={busy || done} /></div>
    <div className="form-field"><label htmlFor="confirmation">Confirm password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={200} required disabled={busy || done} /></div>
    <div className="form-field"><label htmlFor="code">Google Authenticator code (if enabled)</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} disabled={busy || done} /><p>Use the current six-digit code from your first Memocious authenticator.</p></div>
    <button className="button" disabled={busy || done}>{busy ? "Updating…" : "Change password"}</button>
    {message && <p role="status" className="notice">{message}</p>}
  </form>;
}
