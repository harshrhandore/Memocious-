import { z } from "zod";
export const orderCode = z
  .string()
  .regex(/^(GFT|CUS|ENT)-[0-9]{4}-[0-9]{6,12}-[0-9A-HJKMNP-TV-Z]{12}$/);
export const orderQuery = z
  .object({
    code: orderCode.optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    eventPage: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const orderLabels: Record<string, string> = {
  inquiry: "Enquiry received",
  confirmed: "Confirmed",
  payment_received: "Payment recorded",
  in_production: "Being customised",
  quality_check: "Quality check",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  on_hold: "On hold",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
export type CustomerOrder = {
  code: string;
  source: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  estimatePaise: number | null;
  confirmedTotalPaise: number | null;
  paymentReceivedPaise: number;
  paymentVerified: boolean;
  refundRecordedPaise?: number;
  eta: string | null;
};
export type OrderList = { orders: CustomerOrder[]; hasMore: boolean };
export type OrderDetail = {
  order: CustomerOrder;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPricePaise: number | null;
    options: { label?: string }[];
    message: string;
  }[];
  hasMoreItems: boolean;
  events: {
    version: number;
    status: string;
    at: string;
    note: string | null;
  }[];
  hasOlderEvents: boolean;
};
export function pollingDelay(failures: number) {
  return Math.min(300000, 30000 * 2 ** Math.min(Math.max(0, failures), 4));
}
