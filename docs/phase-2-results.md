> Hosted update, 27 October 2026: all Phase 2 migrations have now been applied to staging and its SQL transaction suite passed on hosted PostgreSQL with rolled-back fixtures. Flags are configured, but Netlify cannot deploy current main because account credits are exhausted. Hosted browser/Auth/Storage acceptance remains blocked. See phase-3-progress.md and evidence/phase-3-hosted-rollout.json; these supersede unapplied-migration statements below.

# Phase 2 implementation and verification - 27 October 2026

## Status

The Phase 2 feature implementation is in the repository and pushed in feature increments. Hosted acceptance remains BLOCKED: these new migrations were not applied to Supabase and the feature flag was not enabled by this local development session. This is not a declaration that the phase's hosted Definition of Done passed, or a production release.

Current staging remains https://memocious-staging-v2.netlify.app, project bpvtdehesnlgwccmrlhz. Existing owner/MFA/database records were not recreated or reset. No secrets, database/image backups, dependencies or build output are part of the feature commits.

## Delivered scope

| Specification task | Implementation |
|---|---|
| Home and information | Existing navbar/footer, controlled published-gift carousel with manual controls, explicit play/pause and reduced-motion/focus/hover pause; Enterprise before Loved Ones; occasion strip; genuine consented proof/counters hidden when absent; featured, delivered-quantity bestsellers (90-day window, hidden without data), newest; gifting steps; approved-review testimonials. About/FAQ/contact wording updated. |
| Reviews | Verified-customer BFF, deliberate 0-5 selection and null initial state, one original user/product row including soft deletion, pending edits/restoration/photo changes, private own pending/rejected reads, dated first-name public projection, distribution and average/count from approved current rows, bounded public pagination, report deduplication, owner-only moderation/report queue with optimistic versions and recent MFA. No verified-purchase badge or incompatible rating structured data. |
| Accounts | Wishlist, owned versioned address CRUD (20 addresses), My Reviews and private enterprise/logo access; account export and owner-reviewed deletion-request baseline. Export/deletion require a sign-in within ten minutes. Full erasure execution and legal-retention reconciliation remain Phase 4 work, not falsely reported as deletion. |
| Enterprise/contact | Protected consented guest no-upload submission, organization/type/contact/role/phone/email/GSTIN, product quantities with current MOQ/lead-date assertions, branding, deadline/city/pincode/budget/notes, atomic ENT code and snapshots, request-key replay/conflict, durable in-app notification/outbox, explicit WhatsApp/copy/manual-number continuation. Contact is a saved owner-dashboard message. Current configured business number is used on HTTP retries. |
| Owner workflows | Owner-only queues, new-enquiry badge and paging, contact/retention-review queue, New/Contacted/Quote sent/Negotiation/Won/Lost transitions; internal reason, versioned quote amount/terms/validity/history, agreement assertion for won, retry-safe linked order conversion preserving snapshots without inferring payment. Proof/counter evidence/consent fields, private preview, explicit publication/hiding. |
| Media and catalogue | Separate customer/proof tickets, ownership and version checks, atomic count/byte reservation (2 MiB/file, 5 active files/parent, 20 issues/day and 100 retained files/100 MiB per user), bounded private quarantine/decoder/re-encoded WebP, explicit photo consent/policy version, separately prepared public copy and owner approval. No-store private and approved-public proxies; editing/rejection/deletion removes public authorization. Existing hourly cleanup includes expired/orphan files and closed enterprise logo retention. Static text PDF generated from owner-selected publication data; private preview required before publication. Uploaded PDFs remain disabled, as allowed by specification 13.2. |

Product purge retains owned review snapshots using a nullable current-product reference and a stable source identity. It removes the public review projection and leaves Phase 1 deletion/history semantics working. Review/publication writers use a shared transactional advisory lock plus unique constraints and optimistic versions; multi-process/provider race performance is still unverified.

## Observed verification

- PASS under Node 24.19.0: TypeScript, production build and 18 unit tests.
- PASS: migration replay and all local PostgreSQL suites (existing admin/business/grant/10k bounded catalogue tests, wishlist tests and Phase 2 transaction tests). This is embedded PGlite with a minimal auth.users stub, not managed Supabase Auth or actual Storage.
- PASS: Phase 2 zero and mixed aggregates, stale moderation, edit approval reset, restore uniqueness, self-approval and guest denial, reporter deduplication, address/export isolation, private media tickets/ownership/publication/revocation, expired and stale uploads, orphan reconciliation, wishlist 200-entry boundary, ENT/contact retry/conflict/MOQ/date, won assertion and one-order conversion with in-app outbox, counter zero, unpreviewed/draft PDF denial, purge review retention and stale-sign-in export denial.
- PASS: 23 Chromium browser tests, one intentional desktop skip for mobile-only navigation. Twelve checks use isolated Phase 2 React fixtures/intercepted APIs on desktop/mobile; they are UI evidence, not real customer/provider/BFF/Storage integration. Existing storefront/Studio regression checks remain included. Owner quote test includes amount zero, version, terms, validity and deliberate agreement.
- PASS: sample static catalogue PDF parsed/rendered with PyMuPDF, two pages visually inspected for clipping and overlap. No active actions/embedded documents are generated.
- PASS: lint exits successfully (29 warnings and 19 informational diagnostics, including intentional raw private/proxy images to avoid the shared optimizer). Production dependency audit reports zero advisories for this run. Diff whitespace and source/history secret-pattern checks pass; pattern scans do not prove absence of all secrets.
- Generated public RPC type snapshot comes from local migrations using `npm run test:db -- --generate-types`, not a claim about the hosted schema.

External scanners, remote CI and the full hosted milestone security review remain unexecuted/blocked; no blanket vulnerability-free claim is made.

Machine-readable local DB/browser/secret/scale records remain in evidence/. No remote CI, hosted performance score or scanner result is inferred from local checks.

## Explicit limits and blocked acceptance

- BLOCKED: hosted migrations/flag rollout, real verified-customer A/B, owner/editor/direct JWT and Storage tests for Phase 2, real contact/ENT/image/PDF flow, scheduler execution, concurrent multiple-server races, provider failures and deployed header/cache/performance checks. Require the enabled staging deployment and controlled test sessions. Existing Phase 1 hosted evidence does not substitute.
- BLOCKED/manual: password reset followed by new-password success and old-password denial; physical-phone navigation/WhatsApp handoff and cross-browser/device accessibility matrix.
- Optional email is intentionally unconfigured. There is no email send worker or arbitrary-recipient endpoint and no queued/sent email claim. Notifications are immediately available in the owner dashboard; WhatsApp requires the person to press Send.
- Generated PDF currently supports Latin text and normalizes common punctuation/INR. Unsupported scripts produce a clear preview error instead of silently dropping names. A Unicode PDF renderer is a future enhancement; do not publish an unpreviewed catalogue. Uploaded PDF sanitization is intentionally disabled in favour of the permitted static server-owned option.
- Deletion requests retain the account until the owner completes a legal-retention review. This baseline does not implement the Phase 4 erasure worker. JSON exports include owned current records and authenticated media download references, not retained private moderator/internal audit notes.
- Queues are bounded/paged; account summaries show recent reviews/enquiries while export includes retained owned records. Full historical audit browsing and admin appearance/usability redesign remain Phase 5.
- Public copies can be downloaded before removal; no-store proxies stop later authorized delivery but cannot recall bytes already downloaded. Do not claim immediate universal cache purge.
- Owner explicitly deferred BOTH database AND image-file backup/restore rehearsal. Both remain required before production and do not block Phase 2 development. Backup authenticator testing is owner-confirmed.

## Rollout order and rollback

1. Keep `PHASE_2_ENABLED` absent/false. Review and apply the seven `20261027100000` through `20261027100006` migrations, in filename order, to the existing staging project using the normal migration workflow. Do not reset the project or run bootstrap-owner again. Pushed source does not apply migrations.
2. Verify schema/grants/projections and actual private bucket/runtime behavior on staging, then enable `PHASE_2_ENABLED=true` for the intended staging deploy and rebuild. Existing Auth/CSRF/Turnstile/ingress bindings remain required; never expose service credentials in client variables.
3. Execute controlled A/B/owner/editor flows, upload/consent/moderation/revocation, contact/ENT/retry/quote/conversion/PDF, cleanup, cache/security/performance and physical-device checks. Record actual deploy ID/revision and outcomes. No real message is sent by an agent as part of testing.
4. Roll back exposure by setting the flag false and redeploying. Retain additive schema/data/history for review; do not drop business records to reverse a UI release. Production remains gated by all release checks, including both restore rehearsals.

## Owner demo / operating guide

- Gifts on phone: use the existing Studio products workspace for details/media/featured settings. Public home carousel uses published catalogue gifts; featured flags control the featured grid. Do not publish illustrative test drafts as genuine inventory.
- Reviews: after a current MFA verification, open Trust and enquiries > Reviews and reports. Read text and private attachment. Prepare the sanitized public copy for a consented attachment, then approve/reject using the current version. Editing or removing a customer review/photo removes public approval. Reports require a deliberate moderation decision, not automatic deletion by report count.
- Enterprise: use the new badge/queue and enter Contacted before Quote sent. Record quote amount (including a deliberate zero if applicable), terms, validity and reason. Record Won only after genuine agreement. Convert once to a linked enquiry/order; this records no payment. Use the manual follow-up link and press Send yourself. Further changes to converted agreements belong to the linked-order workflow.
- Proof: save a private proof draft with consent/rights reference; upload a redacted image, refresh/review its private preview, prepare the public copy, then activate the current version. Record only genuine counter values and their evidence reference. Hide proof/counters to remove them from subsequent public responses.
- PDF: generate a draft from currently published enterprise gifts, download and inspect every page, refresh the queue, then explicitly publish. Regenerate when catalogue facts change; old PDF bytes may already have been downloaded. Hide to stop new downloads.
- Customer accounts: sign in before submitting an enterprise enquiry if a private logo is wanted; guest enquiries remain no-upload. Owned logos can be reopened under My enterprise enquiries. Review deletion reuses the original row on later restoration. Export and deletion requests need a recent sign-in. The owner reviews retention requests before any eventual Phase 4 erasure process.
- Lost authenticator/leaked credentials: use the existing recovery/key/session-revocation runbooks and tested backup authenticator; do not disable MFA or recreate the owner to bypass a failure.
