import { z } from "zod";
export const builderPayload = z
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
export const draftMutation = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.enum(["create", "save"]),
    id: z.uuid(),
    expectedVersion: z.number().int().min(0),
    schemaVersion: z.literal(1),
    step: z.number().int().min(1).max(4),
    payload: builderPayload,
  }),
  z.strictObject({
    action: z.literal("delete"),
    id: z.uuid(),
    expectedVersion: z.number().int().positive(),
  }),
]);
export type BuilderPayload = z.infer<typeof builderPayload>;
export type BuilderDraft = {
  id: string;
  version: number;
  schemaVersion: 1;
  step: number;
  payload: BuilderPayload;
  expiresAt: string;
  updatedAt: string;
};
export const emptyBuilderPayload: BuilderPayload = {
  budgetMinPaise: null,
  budgetMaxPaise: null,
  giftTypeId: null,
  occasionId: null,
  recipient: "",
  message: "",
};
export const budgetPresets = [
  { label: "Under INR 500", min: 0, max: 49999 },
  { label: "INR 500 to below 1,000", min: 50000, max: 99999 },
  { label: "INR 1,000 to below 2,000", min: 100000, max: 199999 },
  { label: "INR 2,000 and above", min: 200000, max: 100000000 },
];
