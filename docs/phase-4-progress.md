# Phase 4 progress - owned enquiry/order timelines

## Owner workflow increment - 28 October 2026

The default-off Phase 4 implementation now includes an owner queue, exact-code search/status filters, bounded detail/history and transactional pre-dispatch actions. It records agreed scope/total/contact, actual offline receipts/refunds, exact hold/resume, ready-made skip attestation, quality-check return, paid cancellation/refund due and controlled unpaid reopening. Customer summaries distinguish gross receipts and recorded refunds. Owner/fresh-MFA SQL and BFF guards, expected versions, persistent request receipts, unique per-order money references, immutable events/audits and pending in-app outbox entries protect the workflow. The website does not move money or automatically send messages.

See [the exact workflow contract](phase-4-owner-workflow.md). This supersedes historical statements below that owner mutations are entirely unbuilt. It does not complete Phase 4: dispatch evidence/courier/photos remain unbuilt and new shipped/out-for-delivery transitions explicitly fail; coarse/guest tracking, safe tracking links, SLA and account erasure remain outstanding. Dependent acceptance is BLOCKED, not passed. Manual WhatsApp updates contain only code/status and are not delivery evidence.

Migration `20261027183624_phase4_owner_order_workflow.sql` was created through the installed CLI and verified with embedded PostgreSQL. It and earlier Phase 4/5 migrations remain unapplied remotely. `PHASE_4_ENABLED` stays false. No hosted configuration, database reset, owner/MFA recreation or postponed provider/device/restore check occurred. The withdrawn local live-provider testing proposal remains ignored.

Observed: Node 24.19.0 build/TypeScript and 42 unit tests pass; all embedded PostgreSQL suites pass, including owner actions and deliberate duplicate-reference failure/transaction rollback. Lint has zero errors with 33 warnings/20 infos. Semgrep OWASP passes with zero findings/errors over 138 application/job files. Full desktop/mobile Chromium regression: 63 passed, one intentional desktop skip. Four new owner UI cases cover uncertain-result retry, partial payment, authorization-loss clearing, no browser persistence and accessibility/overflow. Desktop/mobile screenshots were visually inspected and remain ignored development artifacts. See `evidence/phase-4-owner-playwright.json`, `evidence/phase-4-owner-semgrep.json` and `evidence/local-postgres.json`. These are isolated SQL/API/component fixtures, not real Auth/BFF/MFA/provider/concurrency/device evidence.

---
Historical reader foundation follows; its unbuilt-owner-action statements are superseded above.

Phase 4 has started; it is not complete. Phase 3 acceptance remains incomplete and owner-deferred until the Netlify deployment issue is resolved. The suggestion to perform those integration checks locally has been withdrawn. This increment introduces independent customer read functionality and ordinary isolated development checks only. No hosted migrations, environment changes, provider tests or manual-device checks were performed.

## Implemented

- `/orders` and `/orders/[code]`, linked from the account only behind the new default-off `PHASE_4_ENABLED` gate. The gate also requires Phase 3/Auth readiness. The routes are noindex and private/no-store. A verified customer app session is required; knowing a reference code is insufficient to access another account's enquiry.
- A single service-only RPC provides customer-owned lists (24/page), historical item details (up to 100, with an explicit overflow notice) and customer-visible events (latest 50/page with older-event paging). Product deletion preserves item names, options and saved prices. The projection excludes internal notes, raw immutable snapshots, contact/address, actor identifiers, refund-due tasks and unvalidated courier fields. Only option labels are projected.
- Timeline labels, genuine zero versus missing prices, estimated versus agreed totals, verified payment amounts and explicit partial-payment wording. No payment, refund or delivery is inferred by this reader.
- Thirty-second no-store polling, bounded retry backoff to five minutes, request cancellation/timeout, offline/hidden-tab pause, manual refresh and a last-checked timestamp distinguished from an actual order change. Authentication/authorization loss clears previously displayed data and stops background polling, even if an intermediary returns a non-JSON error. Neither the read RPC nor customer polling intentionally extends session activity. No browser storage, service worker or direct provider Realtime/token client was added.

## Observed isolated verification

Node 24.19.0 production build/TypeScript pass. All existing embedded PostgreSQL suites plus the new order-read suite pass. The new suite checks A/B/guest/revoked-session denial, no raw internal/contact/option snapshot leakage, bounded list/event paging, zero-price/payment semantics, historical product removal and no polling activity extension. These are synthetic local PostgreSQL fixtures, not the deferred provider integration checks.

All 29 unit tests pass. Four isolated desktop/mobile Chromium checks pass for timeline rendering/partial-payment wording/escaped text, authorization loss and stopping polling, honest empty account state, accessibility/no browser persistence and default-off API denial. They intercept APIs and do not authenticate against Supabase. Evidence is separate in `evidence/phase-4-playwright.json`; the earlier full Phase 3 browser report is retained. Lint has zero errors and the existing warnings. Secret-pattern and whitespace checks pass within the scanner's documented limitations.

## Remaining work and rollout

UNBUILT / BLOCKED dependent checks: transactional owner status/payment/refund/hold/resume rules, owner list/detail/action UI and immutable mutation history/outbox, courier validation and approved customer-visible photos, public coarse `/track` lookup and distributed enumeration limits, scoped guest receipts/grants/recovery/claim protections, manual WhatsApp notification controls and SLA dashboard, account erasure/legal-retention completion. Optional email remains dependent on actual configured consented delivery; no automatic send is claimed. Current UI cannot change order state.

BLOCKED / OWNER-DEFERRED: real Auth/Storage/BFF/owner/MFA/device/concurrency/scheduler and deployment acceptance. Existing Netlify credit exhaustion still prevents current-code publication. Do not claim Phase 3 or Phase 4 acceptance passed. Both database and image-file restore rehearsal remain deferred but required before production, and admin appearance redesign remains Phase 5.

Migration `20261027120000_phase4_owned_order_timelines.sql` was created through the installed CLI and ordered after the existing Phase 3 migrations. Apply it before explicitly enabling Phase 4 after its prerequisites are verified. It is not applied remotely by this increment. Disabling the Phase 4 flag removes the feature while retaining existing orders/events. No data reset, owner recreation or production release is involved.
