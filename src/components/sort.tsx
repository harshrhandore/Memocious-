"use client";
import { useRouter, useSearchParams } from "next/navigation";
export function CatalogueSort({ current }: { current: string }) {
  const router = useRouter();
  const p = useSearchParams();
  return (
    <label className="flex items-center gap-2">
      Sort by{" "}
      <select
        aria-label="Sort gifts"
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(p.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push("?" + next.toString());
        }}
      >
        <option value="featured">Our picks</option>
        <option value="relevance">Search relevance</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="newest">Newest arrivals</option>
        <option value="top-rated">Top rated</option>
        <option value="best-selling">Best selling</option>
      </select>
    </label>
  );
}
