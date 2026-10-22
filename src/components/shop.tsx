import Link from "next/link";
import { getProducts, getTaxonomy } from "@/lib/catalogue";
import { parseFilters } from "@/lib/domain";
import { ProductCard, EmptyState } from "./ui";
import { FilterForm } from "./filters";
import { CatalogueSort } from "./sort";
import { BrowseGate } from "./browse-gate";
export async function Shop({
  params,
  category,
  occasion,
}: {
  params: Record<string, string | string[] | undefined>;
  category?: string;
  occasion?: string;
}) {
  await BrowseGate();
  const parsed = parseFilters({
    ...params,
    ...(category ? { category } : {}),
    ...(occasion ? { occasion } : {}),
  });
  if (!parsed.success)
    return (
      <div className="container section">
        <EmptyState title="Let’s try those filters again.">
          Use a valid price range, up to 20 categories and one of the available
          sort options.
        </EmptyState>
      </div>
    );
  const f = parsed.data;
  const [result, taxa] = await Promise.all([getProducts(f), getTaxonomy()]);
  const taxon = category
    ? taxa.categories.find((c) => c.slug === category)
    : occasion
      ? taxa.occasions.find((c) => c.slug === occasion)
      : null;
  const title =
    taxon?.label ??
    (f.q
      ? `A little something for “${f.q}”`
      : "Little things. Lovely possibilities.");
  const pages = Math.ceil(result.total / f.limit);
  function pageUrl(page: number) {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (
        k === "page" ||
        k === "limit" ||
        v === undefined ||
        v === "" ||
        (Array.isArray(v) && !v.length)
      )
        return;
      if (Array.isArray(v))
        v.forEach((i) => {
          p.append(k, i);
        });
      else p.set(k, String(v));
    });
    p.set("page", String(page));
    return "/shop?" + p.toString();
  }
  return (
    <>
      <div className="container page-header">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">The collection</Link>
          {taxon && (
            <>
              <span>/</span>
              <span>{taxon.label}</span>
            </>
          )}
        </div>
        <span className="eyebrow">THE GIFT EDIT</span>
        <h1>{title}</h1>
        <p>
          For the big days, the small wins, and the just-becauses. Find a gift
          that feels like them.
        </p>
      </div>
      <div className="container shop-layout">
        <aside className="shop-sidebar" aria-label="Filter gifts">
          <FilterForm
            filters={f}
            categories={taxa.categories}
            counts={result.counts}
          />
        </aside>
        <div>
          <details className="filter-mobile">
            <summary>Find your gift · Filters</summary>
            <FilterForm
              filters={f}
              categories={taxa.categories}
              counts={result.counts}
            />
          </details>
          <div className="shop-toolbar">
            <span>
              {result.total}{" "}
              {result.total === 1
                ? "little possibility"
                : "little possibilities"}
            </span>
            <CatalogueSort current={f.sort} />
          </div>
          {f.sort === "best-selling" && (
            <p className="notice mb-6">
              Sales ranking is not available yet. Showing the featured
              collection.
            </p>
          )}
          {result.products.length ? (
            <div className="product-grid">
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState title="Your perfect gift is still out there.">
              No gifts match these filters. Try another budget, choose a
              different occasion, or explore the whole collection.
            </EmptyState>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Catalogue pages">
              {f.page > 1 && (
                <Link href={pageUrl(f.page - 1)} aria-label="Previous page">
                  ←
                </Link>
              )}
              {Array.from(
                { length: Math.min(7, pages) },
                (_, i) => Math.max(1, Math.min(f.page - 3, pages - 6)) + i,
              ).map((page) => (
                <Link
                  key={page}
                  href={pageUrl(page)}
                  aria-current={page === f.page ? "page" : undefined}
                >
                  {page}
                </Link>
              ))}
              {f.page < pages && (
                <Link href={pageUrl(f.page + 1)} aria-label="Next page">
                  →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
