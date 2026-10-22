import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Heart,
  Sparkles,
  Gift,
  Flower2,
  CakeSlice,
  BriefcaseBusiness,
  Gem,
  GraduationCap,
  Sun,
  Baby,
  BookOpen,
  KeyRound,
  Frame,
} from "lucide-react";
import type { Product } from "@/lib/domain";
import { money } from "@/lib/domain";
const icons = {
  gift: Gift,
  flower: Flower2,
  heart: Heart,
  sparkles: Sparkles,
  cake: CakeSlice,
  briefcase: BriefcaseBusiness,
  gem: Gem,
  graduation: GraduationCap,
  sun: Sun,
  baby: Baby,
  book: BookOpen,
  key: KeyRound,
  frame: Frame,
  rings: Heart,
};
export function TaxonIcon({
  name,
  size = 24,
}: {
  name: string;
  size?: number;
}) {
  const Icon = icons[name as keyof typeof icons] ?? Gift;
  return <Icon size={size} strokeWidth={1.4} aria-hidden="true" />;
}
export function ProductCard({
  product: p,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="product-card">
      <div className="product-media">
        <Link
          prefetch={false}
          href={`/product/${p.slug}`}
          aria-label={`Explore ${p.name}`}
        >
          <Image
            src={p.image}
            alt={
              p.images?.[0]?.alt ??
              `${p.name}${p.demo ? " — illustrative sample design" : ""}`
            }
            unoptimized={!p.demo}
            width={640}
            height={640}
            sizes="(max-width:767px) 50vw,(max-width:1023px) 33vw,25vw"
            priority={priority}
          />
        </Link>
        {p.customizable && (
          <span className="product-badge">Personalise me</span>
        )}
      </div>
      <div className="product-info">
        <div className="product-eyebrow">
          {p.categories[0].replace(/-/g, " ")}
        </div>
        <h3>
          <Link prefetch={false} href={`/product/${p.slug}`}>
            {p.name}
          </Link>
        </h3>
        <div className="product-bottom">
          <span>
            {p.pricePaise === null ? (
              "Price on request"
            ) : (
              <>
                From <strong>{money(p.pricePaise)}</strong>
              </>
            )}
          </span>
          <Link
            prefetch={false}
            href={`/product/${p.slug}`}
            aria-label={`View ${p.name}`}
            className="round-arrow"
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <span className="rating-label">
          {p.avgRating === null
            ? "Not yet rated"
            : `${p.avgRating.toFixed(1)}/5 · ${p.reviewCount} reviews`}
        </span>
      </div>
    </article>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Gift size={36} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="button secondary" href="/shop">
        Browse all gifts <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link className="text-link" href={link}>
          Explore the collection <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
