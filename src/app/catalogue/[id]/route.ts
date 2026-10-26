import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePhase2 } from "@/lib/phase2";
import { readSession } from "@/lib/session";
import { rpc } from "@/lib/server-db";
import { cataloguePdf, type CatalogueDocument } from "@/lib/catalogue-pdf";
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    requirePhase2();
    const id = z.uuid().parse((await ctx.params).id);
    const preview = req.nextUrl.searchParams.get("preview") === "1";
    const s = preview ? await readSession() : null;
    const doc = await rpc<CatalogueDocument | null>(
      "memocious_catalogue_document",
      { sid: s?.id ?? null, document: id },
    );
    if (!doc) throw new Error("Unavailable");
    const pdf = cataloguePdf(doc);
    if (preview && s)
      await rpc("memocious_catalogue_preview", { sid: s.id, document: id });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="memocious-catalogue.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Catalogue PDF currently"))
      return new Response(e.message, {
        status: 422,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    return new Response("Catalogue unavailable.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
