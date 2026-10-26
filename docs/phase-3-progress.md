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
