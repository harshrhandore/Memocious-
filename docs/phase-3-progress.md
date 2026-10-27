# Latest increment: product configuration and estimate drafts

This update supersedes the four-step-only scope below. Phase 3 remains in progress, not acceptance-complete.

- Schema-2 drafts now save a published, customizable base gift, current product/pricing version, actual colour/size/add-on choices, quantity, requested date and contact/review details. Guest exploration with saving disabled remains the original four-step preview. Enabled configuration mode presents eight planning stages; Photos is explicitly unavailable and final quote submission is disabled.
- A narrow server configuration endpoint returns at most 48 compatible published gifts, including a specifically selected compatible gift when resuming. Parent-category choices include active descendants. It exposes designated catalogue/options/price/version fields, not customer/admin data.
- The transaction validates current product/type compatibility, active option IDs, duplicates, group limits/required choices, MOQ, message limits, lead time/date range and final-review contact. Required-photo gifts cannot advance beyond the disabled upload prerequisite. The API normalizes valid country-aware phone numbers and rejects incomplete final contact.
- Provisional estimate totals come from trusted current base and selected option prices multiplied by quantity. Actual zero stays zero; no base price means quotation required, and a missing configured upper price is not invented. Estimates exclude final customisation/shipping confirmation and are labelled as the last saved estimate; unsaved edits do not silently change them.
- Pricing-version changes return a conflict. Loading a saved draft identifies stale pricing; the owner-supplied current configuration must be reviewed explicitly. Schema-1 drafts remain readable, keep their message and return to base-gift selection when upgraded. Old schema-1 clients cannot overwrite a schema-2 draft. Type/base-gift changes clear incompatible selected options; draft saves refuse changes that would orphan file references.
- Saving remains behind the default-off `PHASE_3_ENABLED` gate and existing Phase 2/auth readiness. Apply `20261027110001_phase3_configuration_drafts.sql` after the owned-draft migration and all earlier prerequisites, before enabling staging. No remote schema/environment/owner/MFA change was performed. GitHub main still auto-deploys app code only.

Local evidence for this increment: Node 24.19.0 production build, TypeScript, 22 unit tests and all embedded PostgreSQL suites pass; lint exits successfully with existing warnings. The new SQL suite exercises compatible descendants, zero and option/quantity arithmetic, schema-2 cross-user denial, required/duplicate/cross-type/MOQ/date/contact/price-injection rejection, schema upgrade/old-client denial, stale pricing, missing upper/base price semantics and the required-photo block. The full Chromium suite passed 29 tests with one intentional desktop skip; it includes required-option progression, invalid-save feedback, normalized contact and provisional-zero estimate rendering. Fixture tests are not hosted customer/Auth/Storage/concurrency evidence.

Next required Phase 3 work: private builder image tickets and quota reservations, sanitization/crop/preview/expiry/reconciliation, type-change file cleanup, atomic CUS submission/replay/consent and WhatsApp continuation, plus the owner custom-request/quote/conversion workflow. Those feature-dependent tests remain BLOCKED/unbuilt. Real hosted A/B and cross-device resume, provider/storage/scheduler/concurrency and physical-device checks remain BLOCKED pending prerequisites and enabled staging. Both restore rehearsals remain required before production and owner-deferred; Phase 5 admin appearance work remains deferred.

---
Historical foundation evidence follows.

# Phase 3: owned draft foundation - 27 October 2026

Phase 3 has started; it is not complete. Phase 2 local implementation is present, while hosted Phase 2 acceptance remains blocked as recorded in phase-2-results.md. Independent local draft development does not certify those prerequisites.

## Dependency-aware checklist

1. Preserve existing catalogue, enquiry identifiers, ownership, CSRF/session/MFA, private media and Phase 2 contracts.
2. Activate only owned, versioned schema-1 draft storage and the first four planning steps. Do not accept files, estimates, contact submission or CUS creation through this adapter.
3. Keep guest exploration in React memory; require a verified customer session for saved drafts, resume and delete. No localStorage/sessionStorage/service-worker persistence of personal content.
4. Test actual SQL grants/ownership/versions/expiry independently from UI fixtures. Keep provider/device/concurrency checks blocked until enabled staging and controlled sessions exist.
5. Next: trusted product-compatible colours/add-ons and pricing configuration, budget/quantity/date/contact validation, private file reservations/ingress/sanitization/reconciliation, remaining steps, atomic CUS submission, owner quote/request workflow and complete builder integration tests.

## Implemented in this increment

- `/build-a-gift` offers budget, DB-backed category gift type, optional occasion/recipient nickname, and a bounded 500-codepoint escaped message preview. This is labelled as a four-step draft development preview, with no enquiry/order submission or estimate claim.
- Non-overlapping INR budget presets use integer paise: below 500, 500 to below 1,000, 1,000 to below 2,000, and 2,000 or above (bounded at INR 1,000,000). Custom minimum/maximum are validated.
- `/api/builder/drafts` uses existing verified customer sessions, session-bound CSRF and the shared account/profile rate budget. Writes use strict payload schemas, live taxonomy assertions, schema version 1, optimistic expected version, prior-step prerequisites and an active ten-draft cap.
- Draft creation uses a random in-memory request/draft ID, allowing matching creation retries without duplicates. Save/read/list/delete derive the owner only from the live app session. Other-account/admin/guest access is not permitted by this adapter; browser provider roles receive no function/base-table grants.
- Explicit first save, two-second debounced autosave, acknowledged-versus-unsaved status, server resume, reset and versioned delete. A stale save leaves in-memory edits intact and offers loading the current server version with an in-memory comparison. Failed saves stop automatic retries until explicit retry; they never claim success. Unsaved navigation prompts the browser before leaving.
- Drafts expire after 30 days; access to expired drafts is denied. The existing hourly job can clean up up to 100 expired unsubmitted drafts without files/custom requests when the Phase 3 flag is enabled. Drafts with file references are retained for the future file reconciliation flow, and manual deletion rejects live file references.
- Reauthenticated account JSON export now includes only the current customer's draft records. The public RPC type snapshot is regenerated from local migrations.

## Rollout boundary

`PHASE_3_ENABLED` defaults false, requires live Phase 2 configuration and existing auth/protection readiness. Account saving and its APIs remain disabled unless that gate is enabled. Guest exploration is available without the new migration and explicitly says it is not saved. Applying app commits does not apply migrations.

Do not enable saved drafts on staging until Phase 2 migrations and its hosted prerequisites have been checked, then apply `20261027110000_phase3_owned_drafts.sql` without resetting the project. Do not recreate owner/MFA setup. A GitHub-main push triggers Netlify, so the default-off gate is deliberately retained. No remote migration or environment change was made in this increment.

## Verification and limits

- Local SQL suite covers matching creation replay, save/read/version progression, same-owner resume through another app session, A/B read/update/delete denial, guest denial, revoked sessions, unsupported schemas/unbuilt steps, mass assignment, unavailable taxonomy, inverted budgets, ten-draft cap, private export, expiry and bounded cleanup. Auth users are minimal synthetic fixtures; this is not Supabase Auth or hosted provider evidence.
- Unit checks cover exact preset boundaries, partial drafts, 500 Unicode codepoints and rejection of authority/estimate injection, oversized messages and unknown schema versions.
- PASS under Node 24.19.0: production build, TypeScript, 20 unit tests and all local PostgreSQL suites. Lint exits successfully with the existing 29 warnings/19 informational diagnostics.
- PASS: 27 desktop/mobile Chromium tests with one intentional desktop skip for mobile-only navigation. New builder checks cover actual guest exploration/no-store/default-off API denial plus isolated autosave conflict/comparison. The source/history secret-pattern scan and diff whitespace check pass; these are not guarantees of absence of every secret. Browser conflict tests use an isolated component fixture with intercepted APIs, separately from PostgreSQL assertions; they do not prove a real provider login/refresh/logout or multi-server race.
- BLOCKED: hosted Phase 2 prerequisites and Phase 3 migration/flag rollout, verified customer A/B cross-device and logout/login resume, production rate/concurrency/retention behavior, physical phone/screen-reader/cross-browser evidence.
- BLOCKED/unbuilt: remaining four builder stages, product-compatible pricing/estimates, uploads/crop/HEIC/EXIF and file ticket/byte quota tests, final CUS retry/conversion/owner request workflow. These checks cannot pass before their implementations and runtime prerequisites exist.
- Both database and image-file restore rehearsal remain owner-deferred but required before production; admin appearance redesign remains Phase 5. No production or full Phase 3 completion is claimed.
