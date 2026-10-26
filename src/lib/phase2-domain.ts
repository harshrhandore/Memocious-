import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
const text = (max: number) => z.string().trim().min(1).max(max);
export const phoneSchema = text(20)
  .transform(
    (v) =>
      parsePhoneNumberFromString(v.startsWith("+") ? v : `+${v}`)?.number.slice(
        1,
      ) ?? "",
  )
  .pipe(z.string().regex(/^[1-9][0-9]{6,14}$/));
export const reviewSchema = z
  .strictObject({
    product: z.uuid(),
    expectedVersion: z.number().int().min(0),
    action: z.enum(["save", "delete"]),
    stars: z.number().int().min(0).max(5).nullable(),
    body: z.string().trim().max(2000),
    firstName: z.string().trim().max(60),
  })
  .superRefine((v, c) => {
    if (
      v.action === "save" &&
      (v.stars === null || !v.body || !v.firstName || /\s/.test(v.firstName))
    )
      c.addIssue({
        code: "custom",
        message: "Choose a rating and first name.",
      });
  });
export const addressFields = z.strictObject({
  label: text(60),
  fullName: text(120),
  lines: text(500),
  city: text(120),
  state: text(120),
  pincode: z.string().regex(/^[0-9]{6}$/),
  phone: phoneSchema,
});
export const addressSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("save"),
    id: z.uuid().nullable(),
    expectedVersion: z.number().int().min(1).nullable(),
    fields: addressFields,
  }),
  z.strictObject({
    action: z.literal("delete"),
    id: z.uuid(),
    expectedVersion: z.number().int().min(1),
  }),
]);

export const contactFields = z.strictObject({
  contactName: text(120),
  email: z.email().max(254),
  notes: text(2000),
  consent: z.literal(true),
});
export const enterpriseFields = contactFields
  .extend({
    organization: text(120),
    organizationType: z.enum(["college", "company", "event", "ngo", "other"]),
    role: text(120),
    phone: phoneSchema,
    gstin: z.union([
      z.literal(""),
      z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
    ]),
    items: z
      .array(
        z.strictObject({
          product: z.uuid(),
          quantity: z.number().int().min(1).max(10000),
        }),
      )
      .min(1)
      .max(20),
    branding: z.strictObject({
      colours: z.string().trim().max(120),
      text: z.string().trim().max(500),
    }),
    deadline: z.iso.date(),
    city: text(120),
    pincode: z.string().regex(/^[0-9]{6}$/),
    budgetMinPaise: z.number().int().min(0).max(1000000000000),
    budgetMaxPaise: z.number().int().min(0).max(1000000000000),
  })
  .refine((v) => v.budgetMinPaise <= v.budgetMaxPaise, "Check budget range")
  .refine(
    (v) => new Set(v.items.map((i) => i.product)).size === v.items.length,
    "Duplicate gifts",
  );
