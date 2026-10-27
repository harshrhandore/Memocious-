import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireBuilder } from "@/lib/builder-server";
import {
  requireCustomerSession,
  readSession,
  requireAdminSession,
  bindSessionCsrf,
} from "@/lib/session";
import {
  guardMutation,
  readBody,
  rateLimit,
  safeJson,
  failure,
  HttpError,
} from "@/lib/security";
import { rpc, serverDb } from "@/lib/server-db";
import { sanitizeImage, MAX_MEDIA_BYTES } from "@/lib/media";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, ctx: Context) {
  try {
    requireBuilder();
    const s = await readSession();
    if (s.audience === "admin") await requireAdminSession(true);
    else if (s.audience !== "customer")
      throw new HttpError(403, "Please sign in.");
    const id = z.uuid().parse((await ctx.params).id);
    const meta = await rpc<{ path: string; bytes: number }>(
      "memocious_builder_file",
      { sid: s.id, file_id: id, action: "read" },
    );
    const { data, error } = await serverDb()
      .storage.from("memocious-sanitized")
      .download(meta.path);
    if (
      error ||
      !data ||
      data.size > MAX_MEDIA_BYTES ||
      data.size !== meta.bytes
    )
      throw new HttpError(404, "Image unavailable.");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
export async function PUT(req: NextRequest, ctx: Context) {
  let id: string | undefined, sid: string | undefined;
  try {
    await guardMutation(req, true);
    requireBuilder();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    sid = s.id;
    id = z.uuid().parse((await ctx.params).id);
    await rateLimit(req, "admin-upload-bytes", s.userId!);
    const meta = await rpc<{
      path: string;
      quarantine: string;
      bytes: number;
      mime: string;
    }>("memocious_builder_file", { sid, file_id: id, action: "claim" });
    if (!req.body || req.headers.get("content-type") !== meta.mime)
      throw new HttpError(422, "Image type changed. Start a new upload.");
    const reader = req.body.getReader(),
      parts: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_MEDIA_BYTES || bytes > meta.bytes) {
        await reader.cancel();
        throw new HttpError(413, "Use an image no larger than 2 MiB.");
      }
      parts.push(value);
    }
    if (bytes !== meta.bytes) throw new HttpError(422, "Image size changed.");
    const storage = serverDb().storage,
      input = Buffer.concat(parts);
    const quarantine = await storage
      .from("memocious-quarantine")
      .upload(meta.quarantine, input, {
        contentType: meta.mime,
        upsert: false,
      });
    if (quarantine.error)
      throw new HttpError(503, "Private upload storage is unavailable.");
    let image: Awaited<ReturnType<typeof sanitizeImage>>;
    try {
      image = await sanitizeImage(input, meta.mime);
    } catch {
      throw new HttpError(
        422,
        "Use a still JPEG, PNG or WebP under 2 MiB and 20 megapixels. Convert HEIC first.",
      );
    }
    const out = await storage
      .from("memocious-sanitized")
      .upload(meta.path, image.data, {
        contentType: "image/webp",
        upsert: false,
      });
    if (out.error)
      throw new HttpError(503, "The sanitized image could not be saved.");
    const ready = await rpc<{ id: string; version: number }>(
      "memocious_builder_file",
      {
        sid,
        file_id: id,
        action: "ready",
        details: {
          width: image.width,
          height: image.height,
          bytes: image.data.length,
          digest: image.digest,
        },
      },
    );
    const removed = await storage
      .from("memocious-quarantine")
      .remove([meta.quarantine]);
    if (!removed.error)
      await rpc("memocious_builder_file", {
        sid,
        file_id: id,
        action: "quarantine-removed",
      }).catch(() => {});
    return safeJson({ ready: true, id: ready.id, version: ready.version });
  } catch (e) {
    if (id && sid)
      await rpc("memocious_builder_file", {
        sid,
        file_id: id,
        action: "reject",
      }).catch(() => {});
    return failure(e);
  }
}
export async function DELETE(req: NextRequest, ctx: Context) {
  try {
    await guardMutation(req);
    requireBuilder();
    const s = await requireCustomerSession();
    await bindSessionCsrf(s);
    const id = z.uuid().parse((await ctx.params).id);
    const b = z
      .strictObject({ version: z.number().int().positive() })
      .parse(await readBody(req));
    await rateLimit(req, "profile", s.userId!);
    const result = await rpc<{ version: number }>("memocious_builder_file", {
      sid: s.id,
      file_id: id,
      action: "remove",
      details: b,
    });
    return safeJson({ version: result.version });
  } catch (e) {
    return failure(e);
  }
}
