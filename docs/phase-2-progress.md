> Superseded by phase-2-results.md for final local implementation, Node 24 checks, 23 passing browser tests and exact remaining hosted blockers. Earlier counts below are historical runs.

# Phase 2 development evidence - 27 October 2026

Feature rollout is disabled unless PHASE_2_ENABLED=true in live mode. Apply all Phase 2 migrations before enabling. GitHub main auto-deploys to Netlify; source pushes do not apply Supabase migrations. No hosted database reset, migration or owner/MFA recreation performed.

Implemented: wishlist, pending 0-5 reviews and reports, own review restore, owner moderation, public aggregate/list projection, address CRUD, account export/deletion-request baseline; ENT/contact transaction adapters and consent, quote/event history and idempotent conversion; separate consented sanitized image/public-copy lifecycle, proof/counter/PDF management adapters and orphan cleanup. See final Phase 2 results for rollout limits and owner instructions (to be recorded after final review).

Observed local checks: all migration replay and existing/new PostgreSQL suites passed using PGlite (minimal auth.users stub); 18 unit tests; TypeScript; production build; 21 Chromium browser tests passed with one intentional desktop skip. New UI fixtures use intercepted APIs, not Supabase provider sessions. Static catalogue sample rendered into two pages and visually checked. Secret-pattern scan passed. No hosted Phase 2/provider/storage/concurrency or physical-phone result is inferred from these checks.

Database and image-file backup/restore remain owner-deferred but required before production. Password reset new-password success/old-password denial and phone/WhatsApp remain manual. Studio appearance redesign is Phase 5. Phase 2 cannot be declared acceptance-complete before its hosted tests are executed.
