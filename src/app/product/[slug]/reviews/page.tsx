import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalogue";
import { phase2Ready } from "@/lib/config";
import { rpc } from "@/lib/server-db";
import type { PublicReview } from "@/components/reviews";
import { BrowseGate } from "@/components/browse-gate";
export const metadata = {
  title: "Gift reviews",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await BrowseGate();
  if (!phase2Ready) notFound();
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const page = Number((await searchParams).page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) notFound();
  const data = await rpc<{ items: PublicReview[]; count: number }>(
    "memocious_reviews",
    { product_slug: p.slug, page_num: page },
  );
  return (
    <article className="container prose">
      <h1>Reviews of {p.name}</h1>
      {data.items.map((r) => (
        <section key={r.key}>
          <h2>
            {r.firstName} - {r.rating}/5
          </h2>
          <time dateTime={r.date}>{r.date}</time>
          <p>{r.body}</p>
          {r.photo && (
            <img
              src={r.photo}
              alt="Customer-submitted gift details"
              width={300}
              height={225}
            />
          )}
        </section>
      ))}
      <nav aria-label="Review pages">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous page</Link>}
        {page * 20 < data.count && (
          <Link href={`?page=${page + 1}`}>Next page</Link>
        )}
      </nav>
      <Link href={`/product/${p.slug}#reviews-heading`}>
        Back to gift and review form
      </Link>
    </article>
  );
}
