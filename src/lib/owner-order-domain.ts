import { z } from "zod";
import { orderCode, orderLabels, type CustomerOrder } from "./order-domain";
import { phoneSchema } from "./phase2-domain";
import { whatsappNumber } from "./whatsapp";
export const orderStates = z.enum([
  "inquiry",
  "confirmed",
  "payment_received",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "on_hold",
  "cancelled",
  "refunded",
]);
export const ownerOrderQuery = z.strictObject({
  code: orderCode.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  eventPage: z.coerce.number().int().min(1).max(10000).default(1),
  status: z.union([orderStates, z.literal("")]).default(""),
});
const common = {
  id: z.uuid(),
  version: z.number().int().positive(),
  requestKey: z.uuid(),
};
const notes = {
  reason: z.string().trim().min(1).max(2000),
  customerNote: z.string().max(2000),
};
const amount = z.number().int().min(1).max(1e12);
export const ownerOrderMutation = z.discriminatedUnion("action", [
  z.strictObject({
    ...common,
    action: z.literal("transition"),
    fields: z.strictObject({
      ...notes,
      status: orderStates,
      agreedTotalPaise: z.number().int().min(0).max(1e12).optional(),
      contactName: z.string().trim().min(1).max(120).optional(),
      phone: phoneSchema
        .refine(
          (v) => !!whatsappNumber(v),
          "Use a valid phone with country code.",
        )
        .optional(),
      readyMadeVerified: z.boolean().optional(),
    }),
  }),
  z.strictObject({
    ...common,
    action: z.literal("receipt"),
    fields: z.strictObject({
      ...notes,
      amountPaise: amount,
      date: z.iso.date(),
      reference: z.string().trim().min(1).max(120),
    }),
  }),
  z.strictObject({
    ...common,
    action: z.literal("refund"),
    fields: z.strictObject({
      ...notes,
      amountPaise: amount,
      date: z.iso.date(),
      reference: z.string().trim().min(1).max(120),
    }),
  }),
]);
export type OwnerOrder = CustomerOrder & {
  id: string;
  contactName: string | null;
  phone: string | null;
  holdFrom: string | null;
  refundDue: boolean;
};
export type OwnerOrderDetail = {
  order: OwnerOrder;
  items: { id: string; name: string; quantity: number; message: string }[];
  hasMoreItems: boolean;
  events: {
    version: number;
    status: string;
    at: string;
    note: string | null;
    internalNote: string | null;
  }[];
  hasOlderEvents: boolean;
  moneyRecords: {
    id: string;
    kind: string;
    amountPaise: number;
    date: string;
    reference: string;
    reason: string;
  }[];
  hasOlderMoneyRecords: boolean;
};
export function ownerTransitions(o: OwnerOrder) {
  const edges: Record<string, string[]> = {
    inquiry: ["confirmed", "on_hold", "cancelled"],
    confirmed: [
      "payment_received",
      ...(o.confirmedTotalPaise === 0 ? ["in_production"] : []),
      "on_hold",
      "cancelled",
    ],
    payment_received: [
      "in_production",
      "quality_check",
      "packed",
      "on_hold",
      "cancelled",
    ],
    in_production: ["quality_check", "on_hold", "cancelled"],
    quality_check: ["packed", "in_production", "on_hold", "cancelled"],
    packed: ["on_hold", "cancelled"], // Dispatch awaits validated evidence fields.
    shipped: ["delivered", "on_hold"],
    out_for_delivery: ["delivered", "on_hold"],
    on_hold: [...(o.holdFrom ? [o.holdFrom] : []), "cancelled"],
    cancelled: o.paymentReceivedPaise === 0 ? ["inquiry"] : [],
  };
  return edges[o.status] ?? [];
}
export function orderNotification(o: OwnerOrder) {
  const phone = o.phone && whatsappNumber(o.phone);
  if (
    !phone ||
    !orderCode.safeParse(o.code).success ||
    !orderStates.safeParse(o.status).success
  )
    return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Memocious update for ${o.code}: ${orderLabels[o.status]}. Please contact us for details.`)}`;
}
