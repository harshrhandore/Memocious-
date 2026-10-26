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
    return new Response(new Uint8Array(cataloguePdf(doc)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="memocious-catalogue.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Catalogue unavailable.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
