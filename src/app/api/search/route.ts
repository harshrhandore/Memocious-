import { type NextRequest, NextResponse } from "next/server";
import { getProducts, catalogueGateEnabled } from "@/lib/catalogue";
import { filtersSchema } from "@/lib/domain";
import { requireCustomerSession } from "@/lib/session";
export async function GET(req: NextRequest) {
  const gated = await catalogueGateEnabled();
  if (gated) {
    try {
      await requireCustomerSession();
    } catch {
      return NextResponse.json(
        { items: [] },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2 || q.length > 100)
    return NextResponse.json(
      { items: [] },
      { status: q.length > 100 ? 400 : 200 },
    );
  try {
    const result = await getProducts(filtersSchema.parse({ q, limit: 5 }));
    return NextResponse.json(
      { items: result.products.map((p) => ({ slug: p.slug, name: p.name })) },
      {
        headers: {
          "Cache-Control": gated ? "private, no-store" : "public, max-age=30",
        },
      },
    );
  } catch {
    return NextResponse.json({ items: [] }, { status: 503 });
  }
}
