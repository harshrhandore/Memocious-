import { z } from "zod";
import { rpc, serverDb } from "@/lib/server-db";
import { demo } from "@/lib/config";
import { getPublicSettings } from "@/lib/catalogue";
import { requireCustomerSession } from "@/lib/session";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const unavailable = () =>
    new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    if (demo) return unavailable();
    const asset = (await params).asset;
    if (!asset.endsWith(".webp")) return unavailable();
    const id = asset.slice(0, -5);
    if (!z.uuid().safeParse(id).success) return unavailable();
    const settings = await getPublicSettings();
    if (settings.requireLogin) await requireCustomerSession();
    const path = await rpc<string | null>("memocious_media_public", {
      image: id,
    });
    if (!path) return unavailable();
    const { data, error } = await serverDb()
      .storage.from("memocious-sanitized")
      .download(path);
    if (error || !data) return unavailable();
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return unavailable();
  }
}
