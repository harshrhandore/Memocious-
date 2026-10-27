"use client";
import { useEffect, useRef, useState } from "react";
import { privateRequest } from "@/lib/client-request";
import type { BuilderDraft } from "@/lib/builder-domain";
const limit = 2 * 1024 * 1024;
export function BuilderFiles({
  draft,
  eligible,
  onBusy,
  onChange,
}: {
  draft: BuilderDraft;
  eligible: boolean;
  onBusy: (busy: boolean) => void;
  onChange: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [status, setStatus] = useState("");
  const transfer = useRef<XMLHttpRequest | null>(null);
  const lastTicket = useRef<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => transfer.current?.abort(), []);
  function choose(f: File | undefined) {
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size < 12 ||
      f.size > limit
    ) {
      setStatus(
        "Choose a still JPEG, PNG or WebP up to 2 MiB. Convert HEIC before choosing it.",
      );
      return;
    }
    setFile(f);
    setStatus(
      "Selected in memory only. Upload to save a private sanitized copy.",
    );
  }
  async function crop() {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > 20000000)
          throw new Error("Use an image at most 20 megapixels.");
        const side = Math.min(bitmap.width, bitmap.height),
          canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.min(side, 2048);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Crop is unavailable in this browser.");
        ctx.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Crop failed."))),
            "image/webp",
            0.82,
          ),
        );
        if (blob.size > limit)
          throw new Error("The cropped image exceeds 2 MiB.");
        setFile(new File([blob], "reference.webp", { type: "image/webp" }));
        setStatus(
          "Square crop prepared in memory. The server will still validate and sanitize it.",
        );
      } finally {
        bitmap.close();
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Crop unavailable.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  async function upload() {
    if (!file || !eligible) return;
    const prior = draft.files?.find((f) => f.id === lastTicket.current);
    if (prior?.status === "ready_private") {
      setFile(null);
      setStatus(
        "That reference was already saved. No duplicate upload created.",
      );
      lastTicket.current = null;
      return;
    }
    if (prior) {
      setStatus(
        "The previous attempt is still pending. Refresh its status or remove it before retrying.",
      );
      return;
    }

    setBusy(true);
    onBusy(true);
    setProgress(0);
    setStatus("Reserving private upload...");
    try {
      const session = await fetch("/api/session", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const ticket = await privateRequest<{ id: string }>(
        "/api/builder/files",
        {
          draft: draft.id,
          version: draft.version,
          bytes: file.size,
          mime: file.type,
        },
      );
      lastTicket.current = ticket.id;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        transfer.current = xhr;
        xhr.open("PUT", `/api/builder/files/${ticket.id}`);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("X-CSRF-Token", session.csrf);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
          setStatus(
            "Uploading bytes; not saved until server validation finishes.",
          );
        };
        xhr.onload = () => {
          transfer.current = null;
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status < 200 || xhr.status >= 300 || data.ready !== true)
              throw new Error(data.message || "Upload could not finish.");
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "Connection failed. Retry creates a fresh upload ticket.",
            ),
          );
        xhr.onabort = () =>
          reject(
            new Error(
              "Transfer stopped. Processing may have finished; refresh the draft to check. Unfinished data is cleaned later.",
            ),
          );
        xhr.send(file);
      });
      await onChange();
      setFile(null);
      setStatus(
        "Sanitized reference saved privately. It is not publicly published or attached to WhatsApp.",
      );
    } catch (e) {
      await onChange().catch(() => {});
      setStatus(
        e instanceof Error
          ? e.message
          : "Upload failed. Your selected file remains in memory for retry.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
      transfer.current = null;
    }
  }
  async function remove(id: string) {
    setBusy(true);
    onBusy(true);
    try {
      const session = await fetch("/api/session", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const r = await fetch(`/api/builder/files/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: JSON.stringify({ version: draft.version }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      await onChange();
      setStatus(
        "Reference access removed. Stored bytes are scheduled for cleanup.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not remove reference.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section aria-label="Private builder images">
      <p>
        Up to five still images, 2 MiB each, at most 20 megapixels. Images stay
        private. Do not upload unnecessary personal or children's identifying
        details.
      </p>
      <fieldset
        aria-label="Add a private reference"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(e.dataTransfer.files[0]);
        }}
      >
        <label className="form-field">
          Choose or drop a reference image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
        <label className="form-field">
          Take a reference picture
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={busy}
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      </fieldset>
      {preview && (
        <>
          <img
            src={preview}
            alt="Selected private reference preview"
            width={240}
            height={180}
          />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void crop()}
          >
            Crop centre square
          </button>
          <button
            type="button"
            className="button"
            disabled={busy || !eligible || (draft.files?.length ?? 0) >= 5}
            onClick={() => void upload()}
          >
            Upload private reference
          </button>
        </>
      )}
      {!eligible && (
        <p>Save current draft changes before uploading or removing files.</p>
      )}
      {busy && (
        <>
          <progress value={progress} max={100} aria-label="Bytes uploaded" />
          <p>
            {progress}% of request bytes transferred; validation may still be
            running.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={!transfer.current}
            onClick={() => transfer.current?.abort()}
          >
            Stop transfer
          </button>
        </>
      )}
      {draft.files?.map((f) => (
        <article key={f.id}>
          {f.status === "ready_private" ? (
            <img
              src={`/api/builder/files/${f.id}`}
              alt="Saved private gift reference"
              width={240}
              height={180}
            />
          ) : (
            <p>Upload {f.status}. It is not ready for submission.</p>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={busy || !eligible}
            onClick={() => void remove(f.id)}
          >
            Remove reference
          </button>
        </article>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() =>
          onChange().catch(() => setStatus("Could not refresh file status."))
        }
      >
        Refresh file status
      </button>
      <p role="status">{status}</p>
    </section>
  );
}
