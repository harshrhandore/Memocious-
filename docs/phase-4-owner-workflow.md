# Phase 4 owner actions - local contract

This pre-dispatch increment does not complete Phase 4 or hosted acceptance. It requires the existing default-off Phase 4 flag, prior migrations and `20261027183624_phase4_owner_order_workflow.sql`. No remote migration or flag changed.

## Authority and visibility

`/api/admin/orders` and service-only RPCs require active owner/aal2. Mutations also require MFA within five minutes, CSRF/origin, distributed limits, strict fields, live SQL authority, expected version and UUID request key. Editors remain denied. Browser roles get no function/table grants; new tables have RLS. Service-role UPDATE/DELETE is withheld on money records and action receipts. The source checks follow Supabase least-privilege/short-transaction guidance; these local migrations have not received a hosted advisor/integration run.

Queue: 24 records/page, status filter, exact randomized-code search. Details: designated contact/order fields, first 100 item name/quantity/message projections, 50 events/page and 50 money records/page with explicit older/overflow indicators. No raw snapshots, tokens/session IDs or unnecessary addresses are returned. Manual reads are private/no-store, with no background owner polling. Failed verification clears records. React memory is the only client state; Studio navigation preserves mounted sections.

## Transition table

Every action needs a nonblank internal reason and separately labelled optional customer-visible note. All are qualified owner/fresh-MFA actions.

| From | Allowed next state | Conditions |
| --- | --- | --- |
| inquiry | confirmed, on_hold, cancelled | Confirmation needs agreed integer-paise total, contact name and normalized valid phone; zero is genuine zero |
| confirmed | payment_received, on_hold, cancelled | Actual positive verified receipt required for payment stage; zero-total orders can instead enter in_production with a reason |
| payment_received | in_production, quality_check, packed, on_hold, cancelled | Skipping production requires ready-made owner attestation/reason; attestation retained in redacted audit metadata |
| in_production | quality_check, on_hold, cancelled | Intentional update; no inferred automation |
| quality_check | packed, in_production, on_hold, cancelled | Failed check returns to production without replacing history |
| packed | on_hold, cancelled | New dispatch BLOCKED until validated evidence fields exist |
| existing shipped/out_for_delivery | delivered, on_hold | Actual owner confirmation/reason; no click/webhook inference |
| on_hold | exact saved prior operational state, cancelled | Payment facts preserved; resuming a dispatch state is BLOCKED pending its adapter |
| cancelled | inquiry only when no receipts were ever recorded | Controlled unpaid reopening with fresh MFA/reason/history; paid reopening/corrections unbuilt |
| delivered | no ordinary rollback | Verified refund workflow only; general corrections unbuilt |
| refunded | terminal | No ordinary reopening |

Paid pre-dispatch cancellation is a controlled exception with fresh MFA/reason/history. It preserves receipts and marks refund due for a remaining balance. Zero-total production avoids fabricating a receipt. New shipped/out-for-delivery actions fail even if UI choices are bypassed: dispatch/courier/ETA evidence, processed customer photos and their dependent tests remain unbuilt/BLOCKED.

## Money facts, atomicity and retries

Receipts/refunds record actual owner-verified money moved elsewhere. Each needs positive integer paise, actual nonfuture India date, private reference and verification reason. Actual receipt dates may predate online record creation. Website redirects are never proof and this app performs no transfer.

Receipts require an agreed total and eligible nonterminal state, may be partial and cannot exceed the agreed total. Recording one does not automatically advance fulfilment. Overpayment/correction workflows are unavailable; never change a genuine amount to fit these controls. Refunds are allowed only after cancellation/delivery and cannot exceed gross receipts less earlier refunds. Partial refund keeps current business state; verified return of the entire recorded receipt amount produces refunded. Gross receipts remain historical facts, not silently rewritten to net/zero. Customers receive aggregate refund amounts, never private references/evidence/actor IDs.

One transaction locks the order, validates authority/version/edge/facts, updates version, appends immutable event and optional money record, redacted audit and one pending in-app outbox entry. Pending is not delivered/read; no new email/WhatsApp sender exists. Unique `(order, kind, reference)` rejects accidental duplicate entry with a different key. A forced duplicate-money insert test verifies rollback of earlier order/event writes.

Persistent owner-scoped action receipts bind order/version/action/fields to a SHA-256 payload hash and saved response. Identical retries return original acknowledgement after subsequent progress; changed payloads/stale new requests conflict. General expiring enquiry-key cleanup does not purge them. Retention/erasure policy still needs broader legal/account review. Row locks/uniqueness are transaction controls; single-process fixtures do not establish cross-server race/load acceptance.

An uncertain HTTP/network result preserves the exact body/key in React memory, disables edits/navigation controls, warns on browser unload and offers retry of the same action. It never claims rollback. A definitive version conflict requires refresh/review. Reload/device loss cannot preserve this memory: reconcile history/references before another entry; persistent server receipts/reference uniqueness remain safeguards.

## Notification and evidence boundary

Manual WhatsApp validates the destination and includes only code/status. It excludes internal reason, bank reference, personal message/photo/token/grant. Owner presses Send; opening the link changes no delivery/payment fact. Safe tracking-link inclusion waits for unfinished tracking adapters. Missing/invalid numbers show unavailable.

Evidence: `evidence/local-postgres.json` (synthetic Auth/embedded PostgreSQL), 42 passing units, `evidence/phase-4-owner-playwright.json` (63 passed/one intentional skip), `evidence/phase-4-owner-semgrep.json` (138 files/77 applicable rules/zero findings/errors). Build/TypeScript and lint pass with existing warnings. SQL covers roles/recent MFA, agreement/zero, partial receipts, future/overpayment/duplicate rejection, rollback, stale/replay, exact hold/resume, ready-made/quality return, dispatch denial, paid cancellation and partial/full refund history with one event/audit/outbox per successful action. Four new UI fixture checks cover retry and private-data clearing, plus accessibility and no persistence.

BLOCKED / owner-deferred: deployed schema/configuration; real customer/owner Auth/BFF/MFA/revocation; multi-server/concurrency/outage/scheduler/cache/file integration; physical-device/WhatsApp/camera; BOTH DB AND image-file restore rehearsals. No withdrawn local live-provider test was resumed. Remaining Phase 4/5/6 core work and release gates remain explicit; Phase 8 integrations are unselected. No production or full-phase completion is claimed.
