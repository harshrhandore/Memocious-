import { phoneSchema } from "./phase2-domain";
import { z } from "zod";
export const builderPayloadV1 = z
  .strictObject({
    budgetMinPaise: z.number().int().min(0).max(100000000).nullable(),
    budgetMaxPaise: z.number().int().min(0).max(100000000).nullable(),
    giftTypeId: z.uuid().nullable(),
    occasionId: z.uuid().nullable(),
    recipient: z.string().trim().max(80),
    message: z
      .string()
      .refine((v) => [...v].length <= 500, "Use at most 500 characters."),
  })
  .refine(
    (v) =>
      (v.budgetMinPaise === null && v.budgetMaxPaise === null) ||
      (v.budgetMinPaise !== null &&
        v.budgetMaxPaise !== null &&
        v.budgetMinPaise <= v.budgetMaxPaise),
    "Check both budget limits.",
  );
const legacyDraftMutation = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.enum(["create", "save"]),
    id: z.uuid(),
    expectedVersion: z.number().int().min(0),
    schemaVersion: z.literal(1),
    step: z.number().int().min(1).max(4),
    payload: builderPayloadV1,
  }),
  z.strictObject({
    action: z.literal("delete"),
    id: z.uuid(),
    expectedVersion: z.number().int().positive(),
  }),
]);
export const builderPayload = builderPayloadV1
  .safeExtend({
    productId: z.uuid().nullable(),
    pricingVersion: z.number().int().positive().nullable(),
    options: z
      .array(z.uuid())
      .max(20)
      .refine((v) => new Set(v).size === v.length, "Choose each option once."),
    quantity: z.number().int().min(1).max(10000),
    requestedDate: z.iso.date().nullable(),
    contact: z.strictObject({
      name: z.string().trim().max(120),
      phone: z.string().trim().max(20),
      email: z.string().trim().max(254),
      city: z.string().trim().max(120),
      pincode: z.string().regex(/^[0-9]{0,6}$/),
    }),
  })
  .refine(
    (v) => (v.productId === null) === (v.pricingVersion === null),
    "Choose a current product configuration.",
  )
  .transform((v) => {
    const phone = phoneSchema.safeParse(v.contact.phone);
    return {
      ...v,
      contact: {
        ...v.contact,
        phone: phone.success ? phone.data : v.contact.phone,
      },
    };
  });
export const draftMutation = z
  .union([
    legacyDraftMutation,
    z.strictObject({
      action: z.enum(["create", "save"]),
      id: z.uuid(),
      expectedVersion: z.number().int().min(0),
      schemaVersion: z.literal(2),
      step: z.number().int().min(1).max(8),
      payload: builderPayload,
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.action !== "delete" && v.schemaVersion === 2 && v.step === 8) {
      const c = v.payload.contact;
      if (
        !c.name ||
        !c.city ||
        !v.payload.requestedDate ||
        !phoneSchema.safeParse(c.phone).success ||
        !/^[0-9]{6}$/.test(c.pincode) ||
        (c.email !== "" && !z.email().safeParse(c.email).success)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Complete contact, phone, email and requested date before review.",
        });
    }
  });
export type BuilderPayload = z.infer<typeof builderPayload>;
export type BuilderEstimate = {
  status: "provisional" | "quote" | "changed" | "unavailable" | "unselected";
  minPaise: number | null;
  maxPaise: number | null;
  pricingVersion: number | null;
};
export type BuilderDraft = {
  id: string;
  version: number;
  schemaVersion: 1 | 2;
  step: number;
  payload: BuilderPayload;
  expiresAt: string;
  updatedAt: string;
  estimate?: BuilderEstimate;
  files?: {
    id: string;
    status: string;
    bytes: number;
    width: number | null;
    height: number | null;
  }[];
};
export type BuilderChoice = {
  id: string;
  name: string;
  version: number;
  pricePaise: number | null;
  maxPricePaise: number | null;
  moq: number;
  leadDays: number | null;
  messageLimit: number;
  requiresPhotos: boolean;
  optionGroups: {
    id: string;
    label: string;
    kind: string;
    required: boolean;
    maxCount: number;
    values: { id: string; label: string; deltaPaise: number }[];
  }[];
};
export const emptyBuilderPayload: BuilderPayload = {
  budgetMinPaise: null,
  budgetMaxPaise: null,
  giftTypeId: null,
  occasionId: null,
  recipient: "",
  message: "",
  productId: null,
  pricingVersion: null,
  options: [],
  quantity: 1,
  requestedDate: null,
  contact: { name: "", phone: "", email: "", city: "", pincode: "" },
};
export function normalizeBuilderDraft(d: BuilderDraft): BuilderDraft {
  return {
    ...d,
    step: d.schemaVersion === 1 ? Math.min(d.step, 2) : d.step,
    payload: {
      ...emptyBuilderPayload,
      ...d.payload,
      contact: { ...emptyBuilderPayload.contact, ...d.payload.contact },
    },
  };
}
export function configurationComplete(
  p: BuilderPayload,
  c: BuilderChoice | null,
) {
  return (
    !!c &&
    p.options.every((id) =>
      c.optionGroups.some((g) => g.values.some((v) => v.id === id)),
    ) &&
    c.optionGroups.every((g) => {
      const n = g.values.filter((v) => p.options.includes(v.id)).length;
      return n <= g.maxCount && (!g.required || n > 0);
    })
  );
}
export const budgetPresets = [
  { label: "Under INR 500", min: 0, max: 49999 },
  { label: "INR 500 to below 1,000", min: 50000, max: 99999 },
  { label: "INR 1,000 to below 2,000", min: 100000, max: 199999 },
  { label: "INR 2,000 and above", min: 200000, max: 100000000 },
];
