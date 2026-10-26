# Phase 2: customer wishlist - 27 October 2026

Phase 2 is in progress, not complete. Current Phase 1 evidence is summarized in phase-1-current-status.md; historical ledger blockers must not override newer hosted evidence or owner instructions.

## Dependency-aware checklist

- Preserve catalogue/enquiry/session/MFA/media contracts and deny direct browser writes.
- Start wishlist using the existing verified-customer session, server-derived identity, private/no-store API and private RLS table.
- Use explicit save/remove state for retry safety, unique user/product constraint, per-user serialization across sessions and bounded 200-entry storage. Only published projection metadata is returned. Hidden entries are retained privately and reappear if republished; no hidden metadata is returned.
- Keep customer state fetched separately from public catalogue rendering. No browser persistent storage.
- Apply the new migration before app deployment; verify hosted customer A/B sessions and phone UI after deployment.
- Next Phase 2 work: reviews/moderation with deliberate zero/null semantics, addresses, enterprise/contact transactions, proof manager and safe public PDF. Customer review photos require a separate consent/sanitization/publication lifecycle; product upload authorization must not be reused blindly.

## Implemented locally

`20261027100000_memocious_wishlist.sql` adds the service-only adapter to the existing deny-by-default wishlist table. GET/POST `/api/wishlist` require customer sessions; POST also checks origin/CSRF, strict input and shared account/profile rate budget. Caller cannot supply a user or session ID. Product page save/remove and account wishlist list use this API. Read results contain only public gift ID/slug/name. Product deletion uses the existing cascade. A hidden gift cannot be newly saved; explicit removal remains possible. Existing grants test includes the new function and wishlist table.

Added the wishlist RPC signature to the local database type snapshot (not regenerated against hosted schema). Also fixed an existing password-reset submit-button lint error without changing recovery logic. The Studio browser fixture now serves its bundle in memory, fixing its Windows temporary-path mismatch.

## Verification

- PASS: embedded PostgreSQL migration replay, existing admin/business/grant tests, and wishlist retry, A/B isolation, guest denial, hidden metadata/save denial, removal and revoked-session tests; fixtures rolled back. Minimal auth fixture is not managed Supabase Auth evidence.
- PASS: TypeScript and production build; 15 unit tests.
- PASS: lint after explicit password-reset submit type; existing 18 warnings and 19 informational diagnostics remain.
- PASS: local Chromium desktop/mobile regression, 11 passed and one desktop skip for mobile-only navigation. Existing suite does not exercise authenticated wishlist UI.
- PASS: pattern-based source/history secret scan (not proof of absence of every secret) and diff whitespace check.
- Runtime limitation: local environment Node 25.2.1, repository specifies Node 24. Repeat release checks on supported Node 24.
- BLOCKED: hosted wishlist/authenticated UI, customer provider-token A/B matrix, concurrent hosted load and quota behavior; migration/app are local and customer test sessions are not supplied. No such checks are counted passed. The cap and advisory-lock concurrency design were reviewed but their boundary/concurrent execution were not independently tested.
- BLOCKED: review/enterprise/photo tests depend on unfinished Phase 2 implementations.

## Deployment and release

No push, remote migration, owner/MFA recreation or production change was performed. Apply the wishlist migration before deploying its app routes. GitHub main auto-deploys to Netlify; explain the migration/deployment sequence before a future push.

Password-reset new-password success/old-password denial and physical-phone navigation/WhatsApp remain manual checks. Owner deferred BOTH database and image-file restore rehearsal; keep required before production without blocking Phase 2. Admin appearance/usability redesign remains Phase 5.
