import { z } from "zod";
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80);
const price = z.number().int().min(0).max(100000000);
export const optionSchema = z.strictObject({
  label: z.string().trim().min(1).max(120),
  kind: z.enum(["colour", "size", "addon"]),
  required: z.boolean(),
  maxCount: z.number().int().min(1).max(20),
  values: z
    .array(
      z.strictObject({
        label: z.string().trim().min(1).max(120),
        deltaPaise: price,
      }),
    )
    .min(1)
    .max(20),
});
export const productFieldsSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    slug: slugSchema.optional(),
    pricePaise: price.nullable().optional(),
    maxPricePaise: price.nullable().optional(),
    description: z.string().max(500).optional(),
    detail: z.string().max(10000).optional(),
    materials: z.string().max(500).optional(),
    dimensions: z.string().max(300).optional(),
    colour: z.enum(["rose", "cream", "gold", "green", "lavender"]).optional(),
    lead: z.enum(["ready", "made-to-order"]).optional(),
    leadDays: z.number().int().min(0).max(365).nullable().optional(),
    moq: z.number().int().min(1).max(10000).nullable().optional(),
    customizable: z.boolean().optional(),
    featured: z.boolean().optional(),
    inStock: z.boolean().optional(),
    enterprise: z.boolean().optional(),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
    messageLimit: z.number().int().min(0).max(500).optional(),
    categories: z.array(z.uuid()).min(1).max(20).optional(),
    occasions: z.array(z.uuid()).max(20).optional(),
    options: z.array(optionSchema).max(10).optional(),
  })
  .refine(
    (f) =>
      f.maxPricePaise == null ||
      f.pricePaise === undefined ||
      (f.pricePaise !== null && f.maxPricePaise >= f.pricePaise),
    { message: "Check the price range." },
  );
export const productMutationSchema = z.strictObject({
  productId: z.uuid().nullable(),
  version: z.number().int().min(1),
  action: z.enum([
    "create",
    "edit",
    "hide",
    "show",
    "delete",
    "purge",
    "duplicate",
  ]),
  fields: productFieldsSchema,
});
export const taxonomySchema = z.strictObject({
  kind: z.enum(["category", "occasion"]),
  id: z.uuid().nullable(),
  version: z.number().int().min(1),
  slug: slugSchema,
  label: z.string().trim().min(1).max(120),
  parentId: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(10000),
  active: z.boolean(),
});
export const settingsSchema = z.strictObject({
  brand: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(160),
  contactEmail: z.email().or(z.literal("")),
  whatsappNumber: z.string().max(15).nullable(),
  requireLogin: z.boolean(),
});
export type AdminTaxon = z.infer<typeof taxonomySchema>;
export type ProductFields = z.infer<typeof productFieldsSchema>;
export type AdminProduct = ProductFields & {
  id: string;
  version: number;
  active: boolean;
  deleted: boolean;
  publicationState: string;
  name: string;
  slug: string;
  pricePaise: number | null;
  images: { id: string; alt: string; sortOrder: number; published: boolean }[];
};
export type AdminSettings = z.infer<typeof settingsSchema>;
