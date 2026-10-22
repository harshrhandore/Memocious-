import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/session";
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
const parseId = (id: string) => {
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(404, "Image unavailable.");
  return id;
};
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const s = await requireAdminSession();
    const id = parseId((await ctx.params).id);
    const meta = await rpc<{ path: string } | null>("memocious_media_read", {
      sid: s.id,
      image: id,
    });
    if (!meta) throw new HttpError(404, "Image unavailable.");
    const { data, error } = await serverDb()
      .storage.from("memocious-sanitized")
      .download(meta.path);
    if (error || !data) throw new HttpError(404, "Image unavailable.");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: NextRequest, ctx: Context) {
  let job: string | undefined;
  let sid: string | undefined;
  try {
    await guardMutation(req, true);
    const s = await requireAdminSession();
    sid = s.id;
    job = parseId((await ctx.params).id);
    await rateLimit(req, "admin-upload-bytes", s.id);
    const meta = await rpc<{ bytes: number }>("memocious_media_claim", {
      sid: s.id,
      job_id: job,
    });
    if (!req.body) throw new HttpError(400, "Choose an image.");
    const reader = req.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MEDIA_BYTES || size > meta.bytes) {
        await reader.cancel();
        throw new HttpError(413, "Use an image no larger than 2 MiB.");
      }
      parts.push(value);
    }
    if (size !== meta.bytes)
      throw new HttpError(422, "The image size changed. Start a new upload.");
    const input = Buffer.concat(parts);
    const mime = req.headers.get("content-type") ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
      throw new HttpError(422, "Convert this file to JPEG, PNG or WebP.");
    const storage = serverDb().storage;
    const quarantine = await storage
      .from("memocious-quarantine")
      .upload(job, input, { contentType: mime, upsert: false });
    if (quarantine.error)
      throw new HttpError(503, "Upload storage is unavailable.");
    let image: Awaited<ReturnType<typeof sanitizeImage>>;
    try {
      image = await sanitizeImage(input, mime);
    } catch {
      throw new HttpError(
        422,
        "This image could not be safely decoded. Use a still JPEG, PNG or WebP under 2 MiB and 20 megapixels.",
      );
    }
    const ready = await storage
      .from("memocious-sanitized")
      .upload(job + ".webp", image.data, {
        contentType: "image/webp",
        upsert: false,
      });
    if (ready.error)
      throw new HttpError(
        503,
        "Image processing could not finish. Please retry.",
      );
    const id = await rpc<string>("memocious_media_ready", {
      sid: s.id,
      job_id: job,
      pixel_width: image.width,
      pixel_height: image.height,
      output_size: image.data.length,
      digest: image.digest,
      failed: false,
    });
    await storage.from("memocious-quarantine").remove([job]);
    return safeJson({ id, ready: true, published: false });
  } catch (e) {
    if (job && sid)
      await rpc("memocious_media_ready", {
        sid,
        job_id: job,
        pixel_width: 1,
        pixel_height: 1,
        output_size: 1,
        digest: "",
        failed: true,
      }).catch(() => {});
    return failure(e);
  }
}
const schema = z.strictObject({
  version: z.number().int().min(1),
  operation: z.enum(["publish", "unpublish", "edit", "remove"]),
  alt: z.string().trim().min(1).max(300),
  position: z.number().int().min(0).max(100),
});
export async function POST(req: NextRequest, ctx: Context) {
  try {
    await guardMutation(req);
    const s = await requireAdminSession();
    const id = parseId((await ctx.params).id);
    const b = schema.safeParse(await readBody(req));
    if (!b.success) throw new HttpError(422, "Check the image details.");
    await rateLimit(req, "admin-media", s.id);
    await rpc("memocious_media_update", {
      sid: s.id,
      image: id,
      product_version: b.data.version,
      operation: b.data.operation,
      alt_text: b.data.alt,
      sort_position: b.data.position,
    });
    return safeJson({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
