# API contracts

Private responses use `Cache-Control: private, no-store`; errors expose a correlation ID and safe message. Mutations require exact configured Origin, a bounded streamed body, strict schemas and HttpOnly CSRF cookie/header agreement. Session mutations additionally bind CSRF to the server registry. SameSite is additional protection. There is no wildcard credential CORS or generic database/storage proxy.

| Route | Current contract |
|---|---|
| GET /api/search?q= | 2–100 characters, at most five public suggestions; respects managed browse gate. |
| GET /api/session | No-store availability, signed-in state and CSRF; never provider tokens. Rotates expired CSRF binding using the opaque session hash. |
| POST /api/auth/start | Google/email, safe return, consent=true, fresh BFF challenge. Email requires a distinct providerChallenge, because Turnstile tokens are single-use. Encrypted PKCE/state/consent marker. |
| GET /auth/callback; GET /auth/confirm | Bound state/verifier/consent, verified nonanonymous provider identity, opaque registry session. No role from profile metadata. |
| POST /api/auth/logout | everywhere boolean, registry revocation before provider call; admin everywhere requires owner and fresh MFA. |
| POST /api/profile | Customer session, fullName only; no user/role/verification fields. |
| POST /api/enquiries | Product UUID, qty1–10000, bounded permitted option UUIDs, Unicode message<=500 and product-specific limit, optional budget/occasion/pincode, consent, idempotency UUID, challenge. SQL independently checks groups/MOQ/prices and atomically snapshots order/item/event/consent/code. Authorized completed replay precedes new challenge. |
| POST /api/admin/auth | Provisioned owner email/password and two distinct challenge tokens. Primary session is aal1 and cannot access business data. |
| POST /api/admin/mfa | List/enroll/verify real provider TOTP. Additional factor enrollment requires current aal2 owner and fresh MFA. First enrollment never grants business assurance itself. |
| GET /api/admin/workspace?page= | Current admin aal2; bounded 24-row page plus typed taxonomy/settings; no-store. |
| POST /api/admin/products | productId/null, version, action=create/edit/hide/show/duplicate/delete/purge and strict fields. Prices integer paise; multiple taxonomy UUIDs; bounded typed option groups. SQL checks current role/session/version. Deletion requires owner/fresh MFA. |
| POST /api/admin/taxonomy | kind, id/null, version, label, slug, parentId/null, sortOrder, active. Prevents cycles and cross-kind parents; refreshes affected public visibility. |
| POST /api/admin/settings | Owner/fresh MFA; brand, tagline, contactEmail, WhatsApp digits/null, requireLogin. Live browse gate also changes direct projection RLS. |
| POST /api/admin/delete | ids/null (all), mode=soft/permanent; initial request returns exact count and ID/version digest. Commit requires same digest and exact DELETE n confirmation. Stale sets conflict. Permanent mode accepts already soft-deleted rows; history snapshots remain. |
| POST /api/admin/number | Retained narrow owner/fresh-MFA number endpoint; country-aware validation, challenge and audit. General Studio settings provide the ordinary workflow. |
| POST /api/admin/media | productId, declared bytes1–2097152, alt; current admin and quotas; returns a one-use session-bound ticket UUID. |
| PUT /api/admin/media/[id] | Raw JPEG/PNG/WebP, exact reserved size<=2MiB, same-origin CSRF; claims ticket before private quarantine, bounded full decoder, metadata strip, WebP re-encode, private attachment. No signed upload grant. |
| GET /api/admin/media/[id] | Current admin check; private sanitized preview, no-store. |
| POST /api/admin/media/[id] | Product version, publish/unpublish/edit/remove, alt and position. Publication is explicit and does not publish a private product automatically. |
| GET /media/[uuid].webp | Rechecks safe public projection and optional customer browse gate on every request; downloads approved sanitized private object; no-store. Live media bypasses Next image optimizer/shared caches. |

Common statuses: 401 expired/invalid session, 403 authorization/CSRF, 409 optimistic/idempotency conflict, 413 byte limit, 422 validation, 429 quota/rate (Retry-After), 503 unavailable provider. Unknown provider/database details are redacted.

Public-safe SQL reads are separate from service-only business/session RPCs. Service credentials bypass RLS, so checked session/role SQL assertions protect BFF actions. Raw browser anon/authenticated/admin provider tokens have no business RPC EXECUTE or private DML grants.

Default distributed limits are atomic Postgres counters: auth5/min/IP and10/hour account hash, enquiry5/10min/IP and20/day actor, upload10/hour actor, admin30/min/session plus IP/global and per-operation global1000/hour. The code trusts only the selected platform-overwritten IP header and hashes identity/IP buckets. Turnstile checks success, action, hostname and fresh timestamp. Hosted spoofing, outage, replay, expiry and parallel provider tests remain required.

Later review/report/wishlist/address, builder, enterprise/contact-submit, customer-upload/grant, tracking, full order management, export/delete-account, quotes/CSV/metrics and notification endpoints are absent/404. Product media is not the later private customer-file lifecycle.
