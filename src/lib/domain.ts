import { z } from "zod";
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
export const codepoints = (s: string) => [...s].length;
const boundedText = (n: number) =>
  z
    .string()
    .trim()
    .refine((s) => codepoints(s) <= n, `Use at most ${n} characters.`);
export const enquirySchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(10000),
  options: z.array(z.uuid()).max(20),
  message: boundedText(500),
  budgetPaise: z.number().int().min(0).max(100000000).nullable(),
  occasion: boundedText(80),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .or(z.literal("")),
  consent: z.literal(true),
  idempotencyKey: z.uuid(),
  challenge: z.string().min(1).max(2048),
});
export const ratingSchema = z.number().int().min(0).max(5);
export const filtersSchema = z
  .strictObject({
    q: z.string().trim().max(100).default(""),
    category: z
      .array(z.string().regex(/^[a-z0-9-]{1,80}$/))
      .max(20)
      .default([]),
    occasion: z
      .string()
      .regex(/^[a-z0-9-]{0,80}$/)
      .default(""),
    min: z.coerce.number().int().min(0).max(1000000).optional(),
    max: z.coerce.number().int().min(0).max(1000000).optional(),
    rating: z.literal("4").optional(),
    customizable: z.literal("true").optional(),
    colour: z
      .array(z.enum(["rose", "cream", "gold", "green", "lavender"]))
      .max(5)
      .default([]),
    lead: z.enum(["ready", "made-to-order"]).optional(),
    stock: z.literal("true").optional(),
    combos: z.literal("true").optional(),
    sort: z
      .enum([
        "featured",
        "relevance",
        "price-asc",
        "price-desc",
        "newest",
        "top-rated",
        "best-selling",
      ])
      .default("featured"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(24),
  })
  .refine((f) => f.min === undefined || f.max === undefined || f.min <= f.max, {
    message: "Minimum price must be no higher than maximum.",
  });
export type Filters = z.infer<typeof filtersSchema>;
export function parseFilters(p: Record<string, string | string[] | undefined>) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === "") continue;
    o[k] = ["category", "colour"].includes(k)
      ? Array.isArray(v)
        ? v
        : v.split(",")
      : Array.isArray(v)
        ? v[0]
        : v;
  }
  return filtersSchema.safeParse(o);
}
export function safeReturnPath(input: unknown) {
  if (typeof input !== "string" || input.length > 1000) return "/account";
  let p: string;
  try {
    p = decodeURIComponent(input);
  } catch {
    return "/account";
  }
  if (
    !p.startsWith("/") ||
    p.startsWith("//") ||
    p.includes("\\") ||
    [...p].some((ch) => ch.charCodeAt(0) <= 32) ||
    !/^\/(account|orders|shop|product|build-a-gift)(\/|\?|$)/.test(p)
  )
    return "/account";
  return p;
}
export function averageRating(ratings: number[]) {
  ratings.forEach((r) => {
    ratingSchema.parse(r);
  });
  return ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;
}
export function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export type Taxon = {
  id: string;
  slug: string;
  label: string;
  parentSlug: string | null;
  icon: string;
  sortOrder: number;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  detail: string;
  pricePaise: number | null;
  maxPricePaise: number | null;
  categories: string[];
  occasions: string[];
  image: string;
  images?: { url: string; alt: string }[];
  optionGroups?: {
    id: string;
    label: string;
    kind: string;
    required: boolean;
    maxCount: number;
    values: { id: string; label: string; deltaPaise: number }[];
  }[];
  messageLimit?: number;
  moq?: number | null;
  leadDays?: number | null;
  seoTitle?: string;
  seoDescription?: string;
  colour: string;
  customizable: boolean;
  lead: "ready" | "made-to-order";
  inStock: boolean;
  featured: boolean;
  avgRating: number | null;
  reviewCount: number;
  materials: string;
  dimensions: string;
  options: { id: string; label: string; deltaPaise: number }[];
  createdAt: string;
  demo: boolean;
};
