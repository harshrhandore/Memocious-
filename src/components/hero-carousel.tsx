"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/domain";
export function HeroCarousel({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [reduced, setReduced] = useState(true);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!playing || reduced || hover || focus || products.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % products.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [playing, reduced, hover, focus, products.length]);
  const p = products[index % products.length];
  if (!p) return null;
  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured gifts"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
      }}
    >
      <div aria-live={playing ? "off" : "polite"} aria-atomic="true">
        <Link href={`/product/${p.slug}`}>
          <Image
            src={p.image}
            alt={p.name}
            width={640}
            height={640}
            priority={index === 0}
            sizes="(max-width:767px) 90vw,45vw"
            unoptimized
          />
          <p>{p.name}</p>
        </Link>
      </div>
      {products.length > 1 && (
        <div className="inline-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setPlaying(false);
              setIndex((i) => (i - 1 + products.length) % products.length);
            }}
          >
            Previous gift
          </button>
          <span>
            {index + 1} / {products.length}
          </span>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setPlaying(false);
              setIndex((i) => (i + 1) % products.length);
            }}
          >
            Next gift
          </button>
          <button
            type="button"
            className="button secondary"
            aria-pressed={playing}
            disabled={reduced}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "Pause rotation" : "Play rotation"}
          </button>
        </div>
      )}
    </section>
  );
}
