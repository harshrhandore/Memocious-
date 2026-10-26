import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePhase2 } from "@/lib/phase2";
import {
  readSession,
  bindSessionCsrf,
  requireAdminSession,
} from "@/lib/session";
import {
  guardMutation,
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
    requirePhase2();
    const s = await readSession();
    if (s.audience === "admin") await requireAdminSession(true);
    const id = z.uuid().parse((await ctx.params).id);
    const meta = await rpc<{ path: string }>("memocious_asset", {
      sid: s.id,
      asset: id,
      action: "read",
    });
    const { data, error } = await serverDb()
      .storage.from("memocious-sanitized")
      .download(meta.path);
    if (error || !data) throw new HttpError(404, "Image unavailable.");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, ctx: Context) {
  let id: string | undefined, sid: string | undefined;
  try {
    await guardMutation(req, true);
    requirePhase2();
    const s = await readSession();
    await bindSessionCsrf(s);
    sid = s.id;
    id = z.uuid().parse((await ctx.params).id);
    await rateLimit(req, "admin-upload-bytes", s.userId ?? s.id);
    const meta = await rpc<{ bytes: number; mime: string; path: string }>(
      "memocious_asset",
      { sid, asset: id, action: "claim" },
    );
    if (req.headers.get("content-type") !== meta.mime || !req.body)
      throw new HttpError(422, "Image type changed. Start a new upload.");
    const reader = req.body.getReader(),
      parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MEDIA_BYTES || size > meta.bytes) {
        await reader.cancel();
        throw new HttpError(413, "Use a still image up to 2 MiB.");
      }
      parts.push(value);
    }
    if (size !== meta.bytes) throw new HttpError(422, "Image size changed.");
    const input = Buffer.concat(parts),
      storage = serverDb().storage;
    const q = await storage
      .from("memocious-quarantine")
      .upload(`phase2/${id}`, input, { contentType: meta.mime, upsert: false });
    if (q.error) throw new HttpError(503, "Upload unavailable.");
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
    if (out.error) throw new HttpError(503, "Image storage unavailable.");
    await rpc("memocious_asset", {
      sid,
      asset: id,
      action: "ready",
      details: {
        width: image.width,
        height: image.height,
        bytes: image.data.length,
        digest: image.digest,
      },
    });
    await storage.from("memocious-quarantine").remove([`phase2/${id}`]);
    return safeJson({ id, ready: true, published: false });
  } catch (e) {
    if (id && sid)
      await rpc("memocious_asset", { sid, asset: id, action: "reject" }).catch(
        () => {},
      );
    return failure(e);
  }
}
