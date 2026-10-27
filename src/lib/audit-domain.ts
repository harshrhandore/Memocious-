import { z } from "zod";
const date = z.iso.date(),
  timestamp = z.iso.datetime({ offset: true });
export const auditQuery = z
  .object({
    from: date.optional(),
    to: date.optional(),
    action: z
      .string()
      .regex(/^[a-z0-9_.-]{0,64}$/)
      .default(""),
    entity: z
      .string()
      .regex(/^[a-z0-9_.-]{0,32}$/)
      .default(""),
    entityId: z.uuid().optional(),
    requestId: z.uuid().optional(),
    cursorAt: timestamp.optional(),
    cursorId: z.uuid().optional(),
    asOf: timestamp.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (Boolean(v.cursorAt) !== Boolean(v.cursorId) || (v.cursorAt && !v.asOf))
      ctx.addIssue({
        code: "custom",
        message: "Cursor requires its snapshot and pair.",
      });
    if (v.from && v.to) {
      const diff = (Date.parse(v.to) - Date.parse(v.from)) / 86400000;
      if (diff < 0 || diff > 89)
        ctx.addIssue({
          code: "custom",
          message: "Choose a date range of up to 90 days.",
        });
    }
  });
export type AuditQuery = z.infer<typeof auditQuery>;
export type AuditEntry = {
  id: string;
  at: string;
  actorKind: string;
  action: string;
  entity: string;
  entityId: string | null;
  requestId: string;
  metadata: { version?: number; count?: number; configured?: boolean };
  withheld: boolean;
};
export type AuditCursor = { at: string; id: string };
export type AuditPage = {
  records: AuditEntry[];
  asOf: string;
  from: string;
  to: string;
  hasMore: boolean;
  nextCursor: AuditCursor | null;
};
export function auditDates(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)!.value;
  const to = `${pick("year")}-${pick("month")}-${pick("day")}`;
  const from = new Date(Date.parse(to) - 29 * 86400000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}
