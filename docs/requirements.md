> Current evidence override (27 October 2026): use phase-1-current-status.md and phase-2-wishlist.md before historical rows below. Staging and owner/MFA exist; hosted owner/media/enquiry workflows passed, Lighthouse 95 / LCP 1.8s, backup authenticator owner-tested. Password-reset credential replacement and physical-phone navigation/WhatsApp remain manual. DB AND image-file restore rehearsal is owner-deferred, required before production, and does not block Phase 2. Admin appearance redesign is Phase 5.

# Requirements ledger

Source: specification.md v2, 21 October 2026. No phase is declared complete. Evidence is described in evidence.md; exact revision is recorded at handoff. Original requirements remain authoritative even when a feature is blocked or unbuilt. PASS applies to a named observed check, not to an entire aspirational feature.

| Brief section | Implementation and verification | Status / remaining work / owner |
|---|---|---|
| 1 Execution rules | Dedicated repo/project, preserved brief, dependency checklist, commits and evidence | PARTIAL: continue provider-dependent Phase 1 once prerequisites exist |
| 2.1 Facts | Brand/palette preserved, no invented contacts/logo/history/proof | PASS for preview |
| 2.2 Defaults | Anonymous browsing, INR integer paise, UTC + Kolkata codes, text wordmark, rating0–5, offline model | PARTIAL: owner must confirm business defaults before launch |
| 2.3 Missing inputs | Business WhatsApp and existing policy-text approval supplied; owner email recorded privately; no owner account yet | PARTIAL: secret/provider/host setup remains blocked |
| 3 Critical invariants | Private BFF/grants, explicit safe projections, no sent/payment inference, honest evidence, no fake trust | PARTIAL; each unimplemented control remains below |
| 4 Technology | Pinned Next/React/TS/Tailwind/Supabase/jose; maintained replacement lint tooling; lockfile | PASS build; provider changelog/prices/plans BLOCKED verification |
| 5.1 Request paths | Public read vs guarded private RPC adapters; demo explicitly separate | PARTIAL; real Auth/Storage/BFF execution BLOCKED secrets/egress |
| 5.2 Responsibilities | Strict server schemas, derived actor/prices, no browser provider SDK/tokens | Local boundary tests PASS; provider integration BLOCKED |
| 5.3 Database access |37 privateRLS tables, zero browser private grants/business RPC exposure;3 safe projections;39 applied migrations | Managed grants/role checks PASS; actual signedA/B/owner/editor JWT matrix BLOCKED |
| 5.4 Transactions/outbox | Enquiry order/item/event/consent/counter/idempotency commit atomically | Local PostgreSQL tests PASS; real concurrent sessions/outbox workers BLOCKED / unbuilt |
| 6.1 Public identity | Google/magic-link PKCE/state flow and verified nonanonymous guard coded | BLOCKED provider callbacks/SMTP/challenge compatibility/real user tests; owner password-recovery callback/form remains TODO (current link falls back to homepage) |
| 6.2 Session contract | Opaque registry, encrypted tokens, refresh lease, revocation, bound CSRF, explicit current/previous keyring | Local registry/crypto tests PASS; real refresh/logout/revocation/rotation BLOCKED |
| 6.3 Admin | Operator-only verified-account bootstrap, aal1 quarantine, SDK TOTP, active role/recent-MFA checks; full product/taxonomy/settings/media/bulk UI | LocalSQL and desktop/mobile isolatedUI PASS; actual owner enrollment/recovery/provider flows BLOCKED |
| 7.1 Visual/reusable UI | Warm palette, licensed optimized fonts, grids, native dialogs, focus/reduced motion, swipe/zoom/thumbnails | Chromium/axe checks PASS in named flows; physical devices/screen reader BLOCKED |
| 7.2 Taxonomy/routes |24 categories and17 occasion nodes seeded; full typed taxonomy add/rename/reorder/hide and cycle checks | LocalSQL PASS; hosted owner workflow BLOCKED |
| 8 Page experience | Home order with absent proof/testimonials hidden, enterprise first, catalogue/detail, honest enterprise brochure/info/policies | PARTIAL: reviews, builder, tracking, enterprise/contact submissions, full account/admin remain blocked |
| 9.1 Conventions | UUIDs, named schema history, timestamps, integer prices, constraints/grants at creation | PASS reset in local PostgreSQL; CLI home restriction documented |
| 9.2 Tables | All required table groups reserved with deny-by-default grants and principal integrity constraints | PARTIAL contracts: later feature-specific migrations and stronger typed payload rules still required |
| 9.3 Actor matrix | Public-safe reads, private denial, backend session/owner checks | Role-level negatives PASS; user-token/MFA/editor matrix BLOCKED |
| 9.4 Deletion/history | Nullable product reference and immutable order item snapshot; audit/events no service updates/deletes | Local deletion preservation PASS; privacy erasure/restore workflow unbuilt |
| 9.5 Queries/indexes | GIN search, reverse joins, price/created/order/event/draft/job indexes; bounded live SQL | Local scale-plan evidence; actual staging traffic/latency/cost target unverified |
| 10.1 API families | Narrow typed current routes, no generic mutation/file/query proxy; later endpoints absent | PARTIAL, see api.md |
| 10.2 Validation/errors | Strict Zod, bounded streaming, typed option/media input, safe text and explicit401/403/409/413/422/429/503 mapping | Unit/localDB PASS; real provider failures remain unverified |
| 10.3 CSRF/CORS/limits | Exact origin, session-bound CSRF, Postgres atomic IP/actor/global limits, distinct Turnstile/provider tokens | Native rate boundary and local guards PASS; hosted spoof/outage/replay/concurrency/backoff BLOCKED |
| 11.1 Enquiry algorithm | Stable guest actor, canonical hash, atomic GFT counter/random suffix/snapshots, authorized completed replay | Local DB PASS; real concurrent/request retry tests BLOCKED |
| 11.2 WhatsApp privacy | Managed destination918446572382, bounded encoded message/copy/manual anchor, no private links or automatic-send claim | Unit checks PASS; actual registration/Android/iOS/desktop handoff BLOCKED |
| 11.3 Quotes/payment | Estimates only; no payment capture or automatic state inference | PASS preview; quote revision/conversion/offline payment workflow later/unbuilt |
| 12 Reviews/trust | SQL0–5 check + unique account/product; null vs zero unit tests; no fabricated reviews | Publishing/aggregates/moderation/consented photo lifecycle NOT IMPLEMENTED (Phase2) |
| 13.1 Builder | Owned draft/request schema only | BLOCKED Phase1 auth/media; no draft UI or fake persistence |
| 13.2 Enterprise | Genuine brochure/steps + truthful unavailable state; reserved ENT contract | BLOCKED auth/number/protection; form/pipeline/PDF sanitizer unbuilt |
| 13.3 Upload lifecycle | Product media: one-use quota reservation, private quarantine/full decoder/normalized private attachment/approval/cleanup;2MiB cap | Unit/localSQL PASS; hostedStorage/scheduler BLOCKED. Later customer/PDF upload lifecycle UNBUILT |
| 13.4 Private delivery | Checked no-store admin preview and approved catalogue proxy; private buckets/browser-deny | Local contracts PASS; actual storage/token/cache matrix BLOCKED. Customer grants remain unbuilt |
| 14.1 Operational states | Initial enquiry event; enum contract reserves later states | NOT IMPLEMENTED status transition/payment/refund/hold workflows |
| 14.2 Tracking | No public lookup/rich tracking/claim endpoint exposed | NOT IMPLEMENTED; Phase4 requires verified identity/grants/limits |
| 14.3 Notifications/SLA | Schema only; no sender or fake queued/sent success | NOT IMPLEMENTED workers/notification/update UI |
| 15.1 Catalogue | URL filters/counts, relevance/featured/price/new/rating stable sorts, bounded24/cap48, search5, full gallery | Local browse/SQL PASS; best-selling honestly unavailable without evidence; production query performance unverified |
| 15.2 Cache boundary | Dynamic nonce SSR/no-store; no public session refresh; immutable sample media | Current browser header checks; production CDN/private media cache tests BLOCKED |
| 15.3 SEO | Preview noindex, empty sitemap, home alias, truthful metadata, no invented offers/ratings | PARTIAL: production origin/canonicals/OG/JSON-LD pending real content |
| 15.4 Performance/devices | Optimized local fonts, deferred decorative-font preloads, reduced speculative prefetch and scoped loading; controlled mobileLCP2.8–2.9s, performance95, CLS0.002 | FAIL LCP<2.5s; latest raw measurements in evidence.md; physical/hosted matrix BLOCKED |
| 15.5 PWA/consent | Manifest/icons/static-only offline cache, no queued PII, analytics/locales off | Local browser evidence; physical install/update/offline matrix BLOCKED |
| 16.1 Supply chain | Exact lockfile, CI, working/history pattern scan, npm audit, Semgrep203rules/84files | Named local runs PASS with reviewed SAST/style findings; remoteCI/ZAP unrun |
| 16.2 Headers/transport | Nonce CSP, no production eval, frame denial/nosniff/referrer/permissions; staged HTTPS HSTS only | Local HTTP headers checked; deployed TLS/external scanners BLOCKED no host |
| 16.3 Logging/audit | Minimal redacted SQL audit for current admin mutations; no PII logging added | PARTIAL: actual monitoring/alerts/auth-event coverage unconfigured |
| 16.4 Backup/retention/incidents | Operator runbooks and reserved jobs only | BLOCKED: no DB+blob backup/restore/RPO/RTO/cleanup drill |
| 16.5 Privacy/legal | Existing policy texts approved by user, consent enforced before sign-in/enquiry; demo collects noPII | PARTIAL: legal/retention/security-contact and export/erasure workflows remain |
| 16.6 Release gate | Named results/limitations, missing checks explicit | BLOCKED; no production release |
| 17.1 Phase1 | Full catalogue, protected editor/media/settings/bulk code;39 applied migrations and local evidence | INCOMPLETE: hosted deploy, actual Auth/TOTP/BFF/Storage/directJWT matrix, owner password-recovery UI/callback, recovery/release checks andLCP goal |
| 17.2 Phase2 | Independent public home/about/FAQ/enterprise brochure | BLOCKED dependent features; reviews/wishlist/addresses/proof manager/enterprise form/PDF not active |
| 17.3 Phase3 | Denied schema contracts | BLOCKED builder/private uploads/retention |
| 17.4 Phase4 | Denied schema contracts | BLOCKED tracking/state/guest claim/export/deletion |
| 17.5 Phase5 | Denied schema contracts | BLOCKED scoped editor/full CRUD/CSV/metrics/themes/session tooling/backup |
| 17.6 Phase6 | Independent SEO/PWA/cache foundations | PARTIAL; production performance/translation/consent tooling optional and off |
| 17.7 Phase7 | Hardening/evidence/runbook foundations | BLOCKED all mandatory release items must pass |
| 17.8 Phase8 | Roadmap retained intact | NOT APPLICABLE: no integration selected |
| 18 Acceptance | Scenario mapping below | No unexecuted check counted as PASS |
| 19 Handoff | Source, migrations, docs, tests, screenshots, checkpoint, Netlify project and approved extension | PARTIAL: no deployed staging or actual owner training |
| 20 Priority | Phase1 prioritized and dependent features not falsely activated | Continue after blockers; no blanket readiness/security/compliance claims |

## Acceptance scenarios

1. Public browse: implemented; Chromium routes/filter/sort/reset/navigation tests; full hierarchy in SQL/publication; gallery swipe/zoom/thumbnails; real devices unverified.
2. Payload privacy: managed private-schema denial and narrow projection grants tested; real JWT/storage matrix blocked.
3. Authenticity: sample notice, no proof counters/testimonials, no verified-purchase claims. Zero semantics unit test.
4. Idempotency: local DB replay/hash/conflict/counter/item/event tests; real concurrent first-guest and multi-server failure tests blocked.
5. Pricing/options: strict API boundary rejects client price; local DB zero-price/negative quantity/history test; typed groups/MOQ/message constraints exercised locally; managed flow pending.
6. WhatsApp: unit encoding/bounds/country-aware validation, conditional anchor/copy; no real phone/device claim.
7. Missing providers: UI disabled and API503/no-store verified in Chromium flows.
8. Managed BFF: implemented but managed OAuth/link/cookie refresh/revocation matrix unverified.
9. Admin: local policy + guest-denial assertions; actual owner/editor/MFA/recovery/step-up blocking completion.
10. Direct bypass: native anon/public read PASS, authenticated private-read denied, anon session RPC denied; complete signed-token matrix not run.
11. Review: scalar validation/schema only; moderation/aggregate/photo tests not applicable until Phase2 is implemented.
12. Upload: product-media decoder/ticket/quota/publication code implemented and locally tested; actual hosted Storage lifecycle blocked. Customer uploads remain later scope.
13. Private media/grants: checked no-store product image delivery implemented; hosted token/cache tests pending; later customer grants unbuilt.
14. Builder: not implemented; no browser PII persistence or offline queue in current preview.
15. Enterprise: brochure only; no submission/PDF pipeline enabled.
16. Tracking: not implemented; no weak phone-based rich grant exists.
17. State/notifications: initial event only; remaining operational workflow not implemented.
18. CSV/settings: formula helper unit-tested; owner-number guarded code exists; full CSV/theme/import workflow unbuilt.
19. Caching/PWA/SEO: local no-cookie/no-store/CSP and static cache inspection; deployed CDN/real install matrix blocked.
20. Operations: local build/tests/audit/secret evidence; no restore/MFA/security scanner/device certification claim.
21. Phase8: not selected; all integrations deferred, no live payment/message/courier feature.
