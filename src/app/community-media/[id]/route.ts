import { z } from "zod";
import type { NextRequest } from "next/server";
import { requirePhase2 } from "@/lib/phase2";
import { rpc, serverDb } from "@/lib/server-db";
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    requirePhase2();
    const id = z.uuid().parse((await ctx.params).id);
    const meta = await rpc<{ path: string }>("memocious_asset", {
      sid: null,
      asset: id,
      action: "public",
    });
    const { data, error } = await serverDb()
      .storage.from("memocious-sanitized")
      .download(meta.path);
    if (error || !data) throw new Error("Unavailable");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
