import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import taxonomy from "../../data/taxonomy.json";
import previewSettings from "../../data/public-settings.preview.json";
import { demo, config } from "./config";
import { requireCustomerSession } from "./session";
import { serverDb } from "./server-db";
import type { Filters, Product, Taxon } from "./domain";
export async function getTaxonomy(): Promise<{
  categories: Taxon[];
  occasions: Taxon[];
}> {
  if (demo) return taxonomy;
  const { data, error } = await (await catalogueDb()).rpc("memocious_taxonomy");
  if (error) throw new Error("Catalogue temporarily unavailable.");
  return data;
}
export function publicDb() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)
    throw new Error("Catalogue is not configured.");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
export function descendants(slugs: string[], taxa: Taxon[]) {
  const set = new Set(slugs);
  for (let n = 0; n < taxa.length; n++)
    for (const t of taxa)
      if (t.parentSlug && set.has(t.parentSlug)) set.add(t.slug);
  return [...set];
}
export async function getProducts(f: Filters): Promise<{
  products: Product[];
  total: number;
  counts: Record<string, number>;
}> {
  if (!demo) {
    const { data, error } = await (
      await catalogueDb()
    ).rpc("memocious_catalogue", {
      filters: f,
    });
    if (error) throw new Error("Catalogue temporarily unavailable.");
    return data;
  }
  const { fixtureProducts } = await import("./fixtures");
  const selected = descendants(f.category, taxonomy.categories);
  const occasions = descendants(
    f.occasion ? [f.occasion] : [],
    taxonomy.occasions,
  );
  const matching = fixtureProducts.filter(
    (p) =>
      (!f.q ||
        (p.name + " " + p.description)
          .toLowerCase()
          .includes(f.q.toLowerCase())) &&
      (!selected.length || p.categories.some((c) => selected.includes(c))) &&
      (!occasions.length || p.occasions.some((c) => occasions.includes(c))) &&
      (f.min === undefined ||
        (p.pricePaise !== null && p.pricePaise >= f.min * 100)) &&
      (f.max === undefined ||
        (p.pricePaise !== null && p.pricePaise <= f.max * 100)) &&
      (!f.rating || (p.avgRating !== null && p.avgRating >= 4)) &&
      (!f.customizable || p.customizable) &&
      (!f.colour.length ||
        f.colour.includes(p.colour as Filters["colour"][number])) &&
      (!f.lead || p.lead === f.lead) &&
      (!f.stock || p.inStock) &&
      (!f.combos || p.categories.includes("combos")),
  );
  const sorted = matching.toSorted((a, b) => {
    switch (f.sort) {
      case "price-asc":
        return (
          (a.pricePaise ?? Infinity) - (b.pricePaise ?? Infinity) ||
          a.id.localeCompare(b.id)
        );
      case "price-desc":
        return (
          (b.pricePaise ?? -1) - (a.pricePaise ?? -1) ||
          a.id.localeCompare(b.id)
        );
      case "newest":
        return (
          b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
        );
      case "top-rated":
        return (
          (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
          b.reviewCount - a.reviewCount ||
          a.id.localeCompare(b.id)
        );
      default:
        return (
          Number(b.featured) - Number(a.featured) || a.id.localeCompare(b.id)
        );
    }
  });
  return {
    products: sorted.slice((f.page - 1) * f.limit, f.page * f.limit),
    total: matching.length,
    counts: Object.fromEntries(
      taxonomy.categories.map((c) => [
        c.slug,
        matching.filter((p) =>
          p.categories.some((s) =>
            descendants([c.slug], taxonomy.categories).includes(s),
          ),
        ).length,
      ]),
    ),
  };
}
export async function getProduct(slug: string): Promise<Product | null> {
  if (demo) {
    const { fixtureProducts } = await import("./fixtures");
    return fixtureProducts.find((p) => p.slug === slug) ?? null;
  }
  const { data, error } = await (
    await catalogueDb()
  ).rpc("memocious_product", {
    product_slug: slug,
  });
  if (error) throw new Error("Catalogue temporarily unavailable.");
  return data;
}
export async function catalogueGateEnabled() {
  return (await getPublicSettings()).requireLogin;
}

async function catalogueDb() {
  if (await catalogueGateEnabled()) {
    await requireCustomerSession();
    return serverDb();
  }
  return publicDb();
}
async function readPublicSettings(): Promise<{
  whatsappNumber: string | null;
  brand: string;
  tagline: string;
  contactEmail: string;
  requireLogin: boolean;
}> {
  // Explicit preview snapshot of owner-approved public settings, also stored in the managed projection.
  // Live mode always reads the managed setting, so contact changes take effect without source edits.
  if (demo)
    return {
      ...previewSettings,
      requireLogin: config.REQUIRE_LOGIN_BEFORE_BROWSING === "true",
    };
  const { data, error } = await publicDb().rpc("memocious_public_settings");
  if (error) throw new Error("Settings temporarily unavailable.");
  return data;
}

export const getPublicSettings = cache(readPublicSettings);
