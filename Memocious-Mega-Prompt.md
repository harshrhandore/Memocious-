# MEMOCIOUS — ONE COMPLETE MEGA PROMPT

Version 2 • 21 October 2026

## 1. Your mission and execution rules

Act as the product engineer, UX designer, database designer and security reviewer responsible for implementing **Memocious**, a mobile-first customized-gifts and hampers website for an Indian business. This entire document is one implementation prompt. Its phases are internal milestones of the same project. Read the whole document before implementation; do not request or generate separate prompts to continue.

Build the core framework first, complete each phase’s acceptance checks, preserve previous working behavior and continue through dependent work that the environment and authorization permit. Phase 8 is a detailed expansion roadmap: implement an integration only when selected by the owner and its real provider prerequisites exist. Do not automatically activate every roadmap feature.

Inspect the actual workspace, repository instructions, installed tools, current project state and available provider configuration. Do not overwrite unrelated work. If no project exists, create a dedicated Memocious project. If implementation exists, inspect it and make an incremental plan tied to this specification. Use small reviewable commits when repository access permits. Keep an internal requirements ledger and checkpoint notes so context loss does not cause duplicated work or forgotten requirements.

Deliver working implementation rather than a screenshot or static mock when executing this prompt. A local demo is useful when infrastructure is unavailable, but it must be labelled accurately and cannot satisfy database/authentication/security acceptance criteria. Never fabricate keys, provider connections, testimonials, customer images, numbers, test results, device coverage, legal approval or a production URL.

Use the defaults in this document for reversible implementation decisions. Ask concise questions only when required business information, external setup, permissions or an unresolved consequential decision blocks dependent work. Continue independent work while waiting. No missing brand logo/domain/phone should block local development. Missing live WhatsApp number blocks live handoff; missing authentication/database setup blocks its integration evidence. Finish the concrete reviewable build and release checks before requesting any required final release approval.

Maintain exactly one source of truth for each invariant. The architectural/access-control decisions below govern every phase. Do not introduce a contradictory authorization path or weaken earlier security controls to make a later feature work. Do not claim that any design is free of vulnerabilities or that a checklist mathematically proves security; produce evidence and state practical limits.

This document supplies the complete requirements. No earlier file, separate prompt, original attachment or previous chat is needed by the builder. Optional features remain explicitly tracked; no requirement may disappear silently.


## 2. Business decisions, defaults and missing inputs

### 2.1 Confirmed facts

- Brand name: **Memocious**.
- Visual direction: use the warm default palette and boutique feel defined here.
- No business WhatsApp number, purchased domain, genuine logo, product photography or legal contact has been supplied in this brief. Do not invent them.
- The owner indicated that business-default changes may follow but did not specify those changes. The following defaults are therefore provisional and editable; confirm them before production commitments.

### 2.2 Provisional defaults

| Decision | Implementation default | Production handling |
|---|---|---|
| Business model | Browse/personalize on website, confirm price/payment/delivery on WhatsApp | No website payment capture until selected Phase 8 payment integration |
| Delivery area | All India, serviceability/shipping arranged offline | Do not guarantee every pincode or date |
| Language | English, architecture ready for Hindi/Marathi | Enable additional languages only with reviewed translations |
| Reviews | Any verified signed-in customer account; one review/product/account; moderated | Do not label a review “verified purchase” without recorded purchase evidence |
| Admins | One owner; editor role reserved | Grant scoped editor access only after role tests |
| Launch products | 50–200 genuine products | Query/index design and staging fixtures cover 10,000+ |
| GST | Optional GSTIN on enterprise inquiry; website invoices later | Offline tax/consumer duties are not waived |
| Enterprise MOQ | Configurable per product | Owner must enter actual MOQ before it is advertised |
| Domain/hosting | Temporary Vercel preview URL | Verify current commercial-use terms/plan before production |
| Currency/time | INR, integer paise; UTC storage; Asia/Kolkata presentation/business code month | Delivery date is a requested calendar date, not a guaranteed instant |
| Logo/tagline | Editable text wordmark; “Thoughtful gifts, made personal.” as editable suggested copy | No invented registered-mark/business-history claims |
| Browsing gate | REQUIRE_LOGIN_BEFORE_BROWSING = false | Server-enforce if enabled; document reduced crawlability/conversion |
| Rating scale | Integer 0–5 inclusive; null/no selection means not rated | Zero is an intentional valid rating, never an unrated placeholder |

Preserve literal 0–5 support unless the owner later chooses otherwise. A no-selection state must be separate from zero throughout UI, validation, database and analytics.

### 2.3 Missing input behavior

Store an absent WhatsApp number as absent; disable new handoff submissions with a clear temporary-unavailable message when ordering is not configured. Do not create unlimited unusable enquiries just because a number is missing. A contact/help action may remain if a genuine channel exists. Require international digits-only format, no plus/spaces/hyphens or leading zero, at most 15 digits and country-code-aware validation; regex alone does not prove WhatsApp registration. Verify actual ownership/availability operationally.

Do not publish empty policy templates as legally approved, demo testimonials as real reviews, random images as products for sale, invented shipping promises, or a security contact that no one monitors. Development fixtures must be clearly nonproduction and excluded from production seeds.

Ask for missing owner decisions at the point they are needed. Keep local implementation defaults explicit in docs/decisions.md. If future owner changes conflict with these defaults, update the single specification/invariant and affected tests together.


## 3. Critical analysis incorporated into this specification

The following are resolved design decisions, not claims that unimplemented controls have already passed:

1. **Anonymous browsing and enquiries are compatible with private accounts.** Login is optional for a product enquiry and mandatory for private saved drafts/uploads, wishlist and reviews. Never claim that login alone retroactively proves ownership of a guest enquiry.
2. **WhatsApp click-to-chat supplies no send/payment/order-confirmation signal.** Separate creation, attempted handoff and owner-confirmed business outcomes. Only the user presses Send.
3. **Server protection must not be bypassable through the Data API.** All application business mutations pass through a trusted backend and server-only transaction functions. Ordinary anon/authenticated tokens cannot directly write business tables or execute mutation functions, including when the token belongs to an admin.
4. **RLS and privileged backend operations are different mechanisms.** RLS protects permitted unprivileged public reads and denies ungranted private access; server-authorized database functions must explicitly enforce mutation invariants because service credentials bypass RLS. Never claim RLS checked a service-role operation.
5. **Row filtering does not hide columns.** Public review/product/settings responses use explicit safe projections and grants/views; review authors’ UUIDs/private moderation fields cannot leak because an approved row is public.
6. **HttpOnly sessions require a compatible architecture.** Use a server BFF with opaque browser session cookies and managed-provider tokens stored server-side. Do not also instantiate a browser auth SDK that expects access to those tokens.
7. **JWT signature validity is not immediate revocation.** App session registry checks, current admin membership and bounded verification/provider token lifetime are explicit; raw issued JWTs are not magically revoked by deleting a cookie.
8. **Google account MFA is not Supabase aal2.** Require the application’s verified Supabase TOTP flow after an allowed primary admin login. Admin recovery must be tested; a new/experimental SDK method is not evidence it works in a selected project.
9. **A hidden admin route is a discoverability choice.** Authorization must work when an attacker knows the route, host, frontend source and identifiers. Separate admin deployment/origin is preferred; no absolute route-secrecy promise.
10. **Public media is public.** Hiding a product removes catalogue/API visibility, not copies of previously published images. Draft/confidential media stays private until publication. No promise that RLS hides an object in a public bucket.
11. **Signed URLs are bearer grants and may interact with caches.** Short expiry alone is not a demonstrated immediate revocation mechanism. Default private delivery uses an authenticated no-store proxy; optional signed storage delivery needs verified provider/cache behavior and explicit residual-risk documentation.
12. **Four phone digits are not strong authentication.** Code+last-four lookup returns only minimal status/date with random code suffix, Turnstile and layered limits. Rich data requires ownership or a scoped verified guest session.
13. **Sequential codes, retries and estimates require transaction design.** Atomic counters, constrained idempotency keys, payload hashes and immutable item snapshots replace MAX()+1/client estimates/multiple retried rows.
14. **Review moderation is a write invariant.** User edits return reviews to pending; unique user/product includes soft-deleted rows; public aggregates count intentional zero ratings correctly.
15. **Photo extension/MIME checks do not validate files.** Private quarantine, actual decode/re-encode, dimension/byte quotas, EXIF removal and controlled promotion are required.
16. **CSV/spreadsheets and PDFs have separate risks.** CSV export neutralizes formula cells; import uses typed limits/dry-run; published admin PDF catalogue follows a safe document pipeline distinct from customer image uploads.
17. **Public publication cannot be fully undone.** Remove/purge copies under the business’s control and explain that third-party/browser downloads may persist; do not promise universal deletion of public media.
18. **Security objectives cannot contradict usability.** Do not demand a fresh challenge for every keystroke/autosave or let attacker guesses permanently lock an order/account. Use layered burst limits, progressive challenges and documented recovery.
19. **Payment, fulfilment and enterprise sales have distinct states.** Hold/cancel/refund rules do not silently erase payment history; Phase 8 integrations map verified provider events to separate payment/shipment records.
20. **Accessibility and scanner scores measure different things.** Contrast/keyboard/real-device checks remain necessary; an external A grade and Lighthouse 90 do not prove security or usability.
21. **Free-tier vendor features change.** Validate pricing/quotas/availability/commercial eligibility/SMTP/WAF/backup capabilities at implementation time. A keep-alive ping is not an uptime guarantee.
22. **Legal compliance is not inferred from having a policy page.** Obtain actual owner/legal decisions for processing, retention, consumer/tax obligations and child-related photo data before production.
23. **Backups are not a restoration until exercised.** Database and object storage both need recovery. Record measured RPO/RTO and practical deletion-from-backup limitations.
24. **Detailed requirements are not test results.** Report each implemented control as PASS/FAIL/BLOCKED/NOT APPLICABLE with evidence; never report an unexecuted external check as passed.

When reviewing subsequent changes, check for these failure modes explicitly rather than repeating a general “secure by default” statement.


## 4. Product vision and technology decision

Memocious helps individual gift buyers find thoughtful customized gifts within their budget and helps colleges, companies and event organizers request bulk-branded gifts. The owner should be able to maintain the catalogue, quote enquiries and update order progress from a phone. This is a boutique storefront, not a multi-vendor marketplace at launch.

Catalogue families include hampers; flower/chocolate/cosmetic/pipe-cleaner/teddy bouquets; resin articles; keychains; photo frames/name plates/varmala preservation plates; puja thalis/Navkar Mantra frames; bookmarks/jewellery; pipe-cleaner articles/mini flower pots/lamps/curtain holders; combos/festive hampers; pens/shirts/mugs and corporate merchandise. Maintain the normalized taxonomy in Section 7.

Choose and lock this baseline after verifying mutually compatible maintained versions:

| Layer | Choice | Rationale/constraint |
|---|---|---|
| Web | Next.js App Router, TypeScript, Tailwind CSS | SSR/ISR public SEO and typed server routes |
| UI primitives | Accessible Radix/shadcn components as needed | Inspect generated code; no claim that a component library guarantees accessibility |
| Hosting | Vercel initially, compatible separate admin deployment if practical | Verify production commercial plan and limits; alternative Cloudflare deployment requires a documented adapter/runtime decision |
| Data | Supabase PostgreSQL, versioned SQL migrations | Relational taxonomy, constraints, transactions, public read RLS |
| Identity | Supabase Auth | Google/magic-link customers; admin primary credential plus Supabase TOTP |
| Web session | Established server session middleware + opaque random session ID, managed provider tokens server-side | HttpOnly cookies, no browser auth token persistence, explicit revocation |
| Storage | Supabase Storage with private staging/quarantine/customer files and public sanitized published media | Separate publication from private upload processing |
| Validation | Strict Zod schemas on server boundaries and DB constraints | Client validation is UX only |
| Limits/challenges | Distributed Redis/Upstash or verified equivalent; Turnstile | App-level protection remains even if hosting WAF plan differs |
| Email | Optional Resend with queue/outbox | Real domain/consent/retry handling before claiming sent |
| Observability | PII-scrubbed Sentry or equivalent + minimal structured logs | Exclude sessions/contact/message/upload content |
| Analytics | Optional Plausible/Umami/GA4 after consent decision | No analytics/replay scripts on admin |
| Jobs | Authenticated scheduled worker/job executor with bounded retries | Needed for cleanup, outbox, media validation and backups; no long unbounded request jobs |

Supabase fits relational search/filtering, one managed identity/database/storage ecosystem and tested authorization boundaries. Firebase is an acceptable ecosystem alternative only after documenting changed relational/query/billing constraints. Clerk/Auth0/Better Auth are not drop-in replacements for database authorization/storage; avoid adding a second auth vendor without a concrete requirement. These are project-specific tradeoffs, not universal claims that other products are inferior.

Use separate local/staging/production configuration and database/storage environments; never run customer-abuse tests against production. Store no credentials in Git, prompts or reports. Modern publishable keys/URLs and Turnstile site keys may be intentionally public; secret/service keys and token-encryption keys are server-only. Prefer current supported key types; do not confuse a project secret API key with a user’s JWT.

Before implementing provider-dependent APIs, check current official docs/changelog, exact installed SDK/CLI help, and enabled project capabilities. Pin legitimate package versions and commit the lockfile. Do not pin an invented version or claim current prices/MAU/SMTP allowances from memory. Recovery-code API support in the earlier review was experimental and documentation differed between sources; verify actual supported behavior in the target setup before using it. Keep verified provider support notes in docs/decisions.md.


## 5. Concrete architecture and trust boundaries

### 5.1 Request paths

Public catalogue request → Next public server route/component → restricted public-safe database query → SSR/ISR cache containing only publishable fields.

Authenticated request → same-origin Next BFF → session lookup + current user verification + role/ownership/CSRF/schema/limits → narrow server-only database transaction function → audited state change → safe response.

Guest enquiry request → Next BFF → valid guest session/rate limit/challenge/strict schema/idempotency → server-only transaction function with no arbitrary user assignment → enquiry/code/item/event commit → explicit WhatsApp continuation.

Private photo request → BFF → current session/ownership or scoped guest permission → authorized storage download → safe decoded media response with private/no-store headers. The browser never receives a privileged storage credential.

### 5.2 Browser/backend responsibilities

The browser may select options, render previews, validate forms for convenience and send authenticated same-origin requests. It cannot decide the user ID, price, role, accepted file contents, review approval, allowed order transition, number destination, payment status or publication permission. Never pass a caller-supplied actor/role/session assurance through to the database unverified.

The backend constructs the trusted actor context from the session registry, managed-provider verification and current role records. Its shared guard functions must be used by route handlers, Server Actions, job endpoints, admin code and media handlers; middleware/hidden buttons alone are insufficient. The server authorization module returns a minimal typed context; no tokens are serialized into client components.

### 5.3 Database access model — one coherent write path

- Enable RLS on application tables at creation. Grant only intended SELECT access to anon/authenticated roles on published public-safe projections, using safe read views or carefully restricted column grants. Deny direct SELECT on private customer/admin/session/contact data; private reads also pass through the BFF and checked server-only read functions. Revoke direct INSERT/UPDATE/DELETE/TRUNCATE on business tables from anon/authenticated, including tokens belonging to the owner.
- Revoke EXECUTE on business mutation functions from PUBLIC, anon and authenticated. Grant only the trusted server execution role. Supabase service-role/secret credentials are one supported server implementation, but they are broad privileged credentials and must be isolated to a server-only adapter.
- All customer/admin business mutations use narrow named server-only RPC/transaction functions with explicit argument types, no arbitrary SQL or table-name argument, and explicit ownership/role/session/state/field checks. Admin functions check the active owner/editor record and the server session registry inside the transaction. Customer functions check current owned actor/session; guest functions assign no registered user ID unless identity is verified.
- Functions receive trusted server context referencing a stored session ID. They must not accept a browser-asserted role/aal2 boolean or trust a phone/email as identity. Registry IDs are not sufficient credentials by themselves: execution is limited to the trusted server role and independently validated server request.
- The server registry stores assurance established by successful managed-provider MFA verification. Admin transaction checks require a nonrevoked app session, correct user/admin audience, unexpired idle/absolute limits, recorded aal2 and recent MFA where required. A code path cannot set this assurance from user input. The database assertions are defense in depth; a compromised privileged credential remains a serious incident and is not contained by RLS.
- Prefer SECURITY INVOKER where the execution role has the narrowly necessary rights. Where SECURITY DEFINER is necessary, use a minimal dedicated owner, fixed safe search_path/fully qualified names, no arbitrary dynamic SQL and explicit EXECUTE grants. Put implementation helpers/role/session data in a non-exposed schema. If a callable RPC entry point must live in an exposed API schema, restrict its EXECUTE rights and verify that anon/authenticated cannot call it.
- Do not claim direct user-JWT writes will simultaneously enforce mandatory BFF Turnstile/rate limits. They are intentionally denied. Tests must prove the denial and prove that authorized backend operations still work.
- RLS still governs any granted unprivileged public reads. Private owned/admin reads are denied directly and served only after BFF/session/object checks through narrow server-only read functions. If future direct owned reads are proposed, their ownership, fresh session/revocation policy and safe column projections require an explicit reviewed architecture change; do not enable them incidentally. Views are security_invoker where supported, with safe output columns and underlying privileges arranged deliberately. Definer views/materialized projections require a documented safe publication process rather than accidental RLS bypass.
- Never globally alter Supabase-managed tables or revoke provider-required Storage/Auth grants without verifying supported configuration. Apply application policies to storage.objects via supported mechanisms; application table policy checks do not replace storage access tests.

### 5.4 Atomicity and distributed side effects

Use a database transaction for each enquiry/items/code/event/idempotency record and each admin status/event/outbox change. Do not try to hold a DB transaction open while calling WhatsApp, email, payment or storage APIs. Durable outbox/jobs coordinate those side effects with at-least-once delivery, deduplication keys, retries and explicit failures. Exactly-once delivery across external systems must not be promised. Outbox workers claim bounded batches with a lease/lock, record attempts and retry-after with jitter/backoff, reclaim expired leases and dead-letter after a configured bound. Unique event/channel/template-purpose deduplication prevents ordinary duplicate sends, while reconciliation handles ambiguous provider outcomes. Scheduled endpoints require independent job authentication and cannot accept a forged customer/admin actor; audit system actions under a distinct identity. Monitor queue age and retention cleanup lag.

Create named helpers such as requireCustomerSession, requireAdminSession, authorizeOwnedObject and assertExpectedVersion as application concepts, not assumed provider API names. Unit-test their composition and database assertion boundaries. Every mutation function returns a safe result projection; it does not expose stored session/provider tokens, internal note fields, raw exception details or unauthorized related records. Add negative tests for entry points, functions, grants and response serialization.


## 6. Authentication, sessions and admin boundary

### 6.1 Public identity

Google OAuth is the primary customer sign-in and email magic link the fallback. Explain why sign in: saved drafts/uploads/wishlist/reviews/private tracking. Let anonymous visitors browse and create product enquiries. Require a verified nonanonymous managed identity for restricted customer actions. Supabase anonymous-sign-in identities are not equivalent to verified customer accounts simply because their database role is authenticated.

Use PKCE/state protection and provider-supported server exchange. Keep temporary verifiers/state in short-lived HttpOnly cookies or server storage, bind to intended app audience and clear after use. Exact callback allow-list; validate relative same-origin return paths, reject protocol-relative URLs/backslashes/encoded external redirect tricks. Never redirect an ordinary customer session into admin authorization solely because next= contains an admin route.

Handle cancelled consent, expired/used links, unverified identity, expired sessions, network errors, duplicate email/provider identities and generic anti-enumeration errors. Never auto-merge accounts solely on an unverified matching email. Password management remains with Supabase; no homegrown password hashing, custom JWT issuer or insecure recovery bypass.

### 6.2 BFF session contract

Use an established server session pattern/middleware rather than inventing cryptographic primitives. Browser cookie contains a cryptographically random opaque token with at least 256 bits of entropy. Store only its hash for lookup. Production cookie: Secure, HttpOnly, SameSite=Lax by default, Path=/ and no Domain attribute; prefer __Host- naming where applicable. Local HTTP development can use documented separate cookie settings; never let that relax production flags.

Provider access/refresh tokens remain only in a private server session store, encrypted at rest with a server-managed key using a maintained authenticated-encryption library or supported managed store. Token encryption/rotation keys are separate from the database key and never public. Store key version to support rotation. Access limited to the server/operator role; no direct public API views, logs, backups without encryption/access policy, or client serialization of these columns.

Session record includes app session ID, cookie-token hash, user ID, provider session reference where available, customer/admin audience, issued/last-active/absolute-expiry/revoked timestamps, verified assurance and MFA verification time. Store only minimal device metadata and minimize/hash IP data with retention. Do not use IP binding that breaks normal mobile network changes as a substitute for identity.

On protected requests verify the live app session, identity as required by current provider guidance, correct audience and object ownership. Signature/expiry checks alone do not establish provider revocation; verify how provider getUser/session validation behaves in the deployed version and document any bounded window. App session revocation is authoritative for all private application reads and mutations because direct unprivileged private SELECT/DML/RPC access is denied. Public projections remain public by design. Do not expose raw provider JWTs to browsers or enable private direct reads merely for SDK convenience.

Serialize or lock provider refresh per session so parallel requests do not invalidate rotating refresh tokens or overwrite newer credentials. A failed refresh produces an explicit sign-in recovery flow, never a fallback privileged client. Set private/no-store on session/callback responses; never run token refresh inside a cached public render that might cache Set-Cookie. A small no-store session endpoint can personalize navbar state separately from the public cached shell.

Rotate the opaque session ID after login, MFA and privilege changes. Revoke the correct app session(s) and provider refresh sessions on logout/everywhere; explain already issued provider JWT limitations and signed/private-media grant lifetimes. For admin logout-everywhere revoke all admin app sessions and associated grants, not merely remove one cookie. Background polling must not extend admin idle lifetime: update idle activity only on authenticated intentional user activity according to a tested rule, and validate old expiry before extending it.

### 6.3 Admin identity and deployment

Prefer a separate admin application/origin on a genuine configured subdomain, with host-only cookies and independent CSP/auth callback configuration. A separate Vercel admin preview hostname is acceptable during staging. If initial constraints require the same app, use a server-configured random path of at least 12 random characters and no public navigation/sitemap/robots listing; secure route/RPC checks remain mandatory even if the path is discovered. Add noindex,nofollow and X-Robots-Tag. Do not embed the secret path in common public client navigation/config modules.

Admin uses an operator-provisioned allow-listed account. Bootstrap once by a protected operator process; disable bootstrap afterward. No default password, first-user-wins, public role assignment, profile metadata role or self-promotion. Owner/admin role table is private and server-managed. Optional Google primary login requires the same downstream Supabase TOTP verification; Google-provider MFA is not assumed to produce Supabase aal2.

Require mandatory TOTP enrollment/challenge verified with Supabase. Quarantine an admin primary-login session to MFA/enrollment endpoints until verified; it cannot read business/admin data. Factor reset, new factor enrollment/unenrollment and lost-device recovery require an audited verified process. Test supported native one-use recovery codes if available and appropriate; show plaintext once, avoid logs, support revocation and safe offline storage. If unsupported/experimental for the selected deployment, use an approved backup-factor/operator recovery procedure and record native-code support as not implemented rather than fake it. Do not ship an untested experimental recovery path as production assurance.

Default admin limits: 30 minutes of actual inactivity and 8 hours absolute lifetime; step-up with a fresh verified factor within 5 minutes for permanent/bulk deletion, role/factor/session changes, WhatsApp number changes, personal-data export and other destructive operations. Recalculate authorization/role on each mutation and include database session assertions. Customer sessions can have a separately configured less restrictive lifetime, reviewed before launch.

Use distributed rate limits/backoff/Turnstile on admin primary login and MFA/recovery. Avoid unlimited credential spraying and attacker-triggered permanent lockout; owner recovery remains possible. No third-party analytics/session replay or unnecessary remote scripts in admin. Provide redacted security alerts for login, new-device indication, failed streaks, factor/role/deletion changes; automatic WhatsApp alerts require Phase 8 API setup, otherwise use configured email/in-app alerts.


## 7. Visual system, reusable components, taxonomy and routes

### 7.1 Design

Warm, celebratory, handcrafted, premium but affordable; real photography, generous whitespace, restrained Indian festive accents. Use an editable Memocious text wordmark and tagline, not invented credentials or testimonials. Lock headings to Fraunces and body/UI to Inter; Playfair Display/Poppins are alternatives only after an explicit design decision;  self-host with next/font and swap. Load Noto Sans Devanagari only when Hindi/Marathi is enabled. Base/input font at least 16px; fluid clamp scale.

| Token | Value | Rule |
|---|---|---|
| primary / hover | #8E2C48 / #741F38 | Primary actions and accents |
| accent | #E8A33D | Decorative/star accents; tested dark text |
| background / surface / alternate | #FFF8F0 / #FFFFFF / #FBE9EC | Cream/white/blush |
| text / muted / border | #2B1F24 / #6B5B61 / #EADBD3 | Verify rendered combinations |
| success / warning / danger | #4F8A6B / #C77700 / #B3261E | Icons plus labels; darken or use dark text as needed |
| decorative WhatsApp / action WhatsApp | #128C7E / #0B7568 | White normal text only on tested action teal |

Use an 8px grid; 12–16px card corners; pill chips; soft shadows; 150–250ms transitions, reduced-motion alternative. Body contrast >=4.5:1; large text and required non-text UI boundaries >=3:1 under the applicable WCAG criteria. Test interactive/seasonal states and keep disabled content understandable; do not falsely assert that every disabled control has the same normative contrast requirement. Light theme first; dark theme later optional. Admin-controlled seasonal token sets for Diwali, Rakhi and Christmas arrive in Phase 5.

Reusable components: Button primary/secondary/ghost/WhatsApp, IconButton, Input, Textarea, Select, Checkbox, Radio, budget Slider, ColorSwatchPicker, FileUploader with drag/drop/mobile picker, StarRating display/input, ProductCard/Grid, ImageGallery swipe/pinch-zoom/thumbnails with optional video, OccasionChip/scroll bar, FilterPanel mobile drawer/desktop sidebar, SortDropdown, Breadcrumbs, Modal/Drawer, Toast, Skeleton, EmptyState, Badge, Tabs, Accordion, Stepper, OrderTimeline, pagination/accessible infinite-scroll fallback, Footer, Navbar, SearchBar suggestions, WhatsAppFloatingButton. Build only needed components each phase; document APIs and examples.

Mobile breakpoints 360/768/1024/1280/1536; test intermediate widths too. Product grid 2/3/4 columns for mobile/tablet/desktop. Minimum 44px targets, visible focus, keyboard support, semantic landmarks, labels/errors and alt text; focus trapping/restoration in dialogs and announced progress/status. Use dvh and safe-area insets, no hover-only controls, real iOS dynamic-toolbar checks. Never disable browser page zoom; provide keyboard/buttons for gallery zoom as well as touch gestures. Reserve media aspect ratios, optimized WebP/AVIF and responsive srcset; lazy-load below fold. Hero carousel needs controls/pause and no inaccessible automatic movement. Aim mobile Lighthouse >=90 in Performance, Accessibility, Best Practices and SEO; LCP <2.5s under documented mid-range Android/4G conditions. Record measured results, not assertions.


### 7.2 Taxonomy and route map

Seed database taxonomy, never duplicate static UI lists:

Categories: Gift Hampers > Festive Hampers; Bouquets > Flower Bouquets, Chocolate Bouquets, Cosmetic Bouquets, Pipe-Cleaner Bouquets, Teddy Bouquets; Resin Articles; Keychains; Photo Frames; Name Plates; Varmala Preservation Plates; Puja Thalis; Navkar Mantra Frames; Bookmarks; Jewellery; Pipe-Cleaner Articles; Flowers > Mini Flower Pots; Lamps; Curtain Holders; Combos; Corporate/Bulk Items (pens, shirts, mugs etc.). Combos also acts as a filter. Correct raw spelling/duplicates; preserve these distinct product families.

Occasions in initial display order: Birthday; Anniversary & Couples; Wedding (including Custom Wedding Packaging); Friendship; Graduation & Farewell; Baby Shower Return Gifts; Naming Ceremony Gifts; Return Gifts; Just Because; Festive Gifting > Rakhi, Diwali, Dussehra, New Year, Christmas; Corporate. Parent/child visibility, ordering and active status are editable. Products have many categories and many occasions; taxonomy deletion cannot orphan links silently.

| Route | Behavior / phase |
|---|---|
| / and /home | One canonical home, alias redirect; optional browse gate, Phase 1 shell / Phase 2 full home |
| /login, /auth/callback, /auth/confirm | Public Google/magic-link auth, safe same-origin return path, Phase 1 |
| /shop | All active products; URL filters/sort/page, Phase 1 |
| /shop/occasion/[slug], /shop/category/[slug] | Indexed active taxonomy catalogues, Phase 1 |
| /product/[slug] | Active product gallery/detail/enquiry, Phase 1; reviews Phase 2 |
| /enterprise | Bulk landing/form/catalogue PDF, Phase 2 |
| /build-a-gift | Resumable authenticated builder, Phase 3 |
| /orders, /orders/[code] | Customer-owner-only list and rich timeline, Phase 4 |
| /track | Minimal anonymous lookup; rich guest tracking via verified single-record guest session, Phase 4 |
| /account | Profile Phase 1; wishlist/reviews/addresses Phase 2; full order/export/deletion workflow by Phase 4 |
| /about, /contact, /faq | Genuine business info; working validated contact behavior; Phase 2 |
| /privacy, /terms, /shipping-returns | Baseline before PII collection, owner/legal finalized Phase 7 |
| Separate admin origin or server-configured secret path | Unlinked, MFA/role/session protected, noindex, Phase 1 onward |

Unbuilt routes are hidden/feature-disabled with truthful unavailable states; no fake working CTA. Admin paths are absent from public navigation, sitemap and robots disallow listings. Missing public content has useful empty states rather than invented claims.


## 8. Page-by-page user and admin experience

**Home, exact content order:** sticky compact navbar (logo, search suggestions, wishlist, account); hero headline/tagline/best-products carousel/CTA; two large path cards, Enterprise/Bulk first and Gifts for You & Loved Ones second (desktop side by side, mobile stacked); horizontal icon/label occasion bar with snap, fades and active state; genuine admin-managed sales-proof gallery with captions/optional first name/city and editable genuine delivered-order/customer/city counters; featured/bestseller/new-arrival rows; Choose → Personalise → Chat on WhatsApp → Receive explanation; approved-review testimonials; footer policies/contact/WhatsApp/social links. Floating WhatsApp control never covers sticky actions. Reduced-motion counters show static numbers. Hide trust content until supplied/redacted/consented.

**Catalogue:** title/description/result count; category multi-select with counts, min/max price inputs plus slider, 4+ rating, customizable, colour, ready-to-ship/made-to-order, in-stock, combos. Mobile filter drawer, desktop sidebar. All state in validated URL params, immediate category/occasion navigation, back/share safe. Sort featured/relevance, price ascending/descending, newest, top-rated and best-selling using documented stable tie-breaker IDs. No fabricated best-seller metrics. Server filters and paginates (default 24, cap 48), never fetch all products. Cards show responsive image/desktop second-image hover, name, INR/from price, real rating or “not yet rated”, customizable badge and wishlist. Skeleton/error/empty states, reset filters and builder CTA when enabled. Suggestion search is debounced, bounded and accessible; Postgres full-text search and indexed joins. Numbered pagination is the default SEO fallback.

**Product:** swipe/zoom/thumbnails and optional video; name, price or honest range, availability/lead time, short/long descriptions, materials, dimensions, exactly permitted name/message/photo/colour/size/add-on/packaging options and limits. Order on WhatsApp primary, Customise this/wishlist/share secondary. Related products and more-for-occasion. Phase 2 adds approved rating average/distribution, dated first-name review list, own edit/delete, report, optional photo, star input and moderation. Structured data reflects genuine approved reviews and truthful product pricing only.

**Enquiry:** strict server validation of selected active options, bounded quantity and personalization. Server recalculates estimate from trusted product/option values; no client price trust. Generate atomic code GFT-YYMM-sequence-randomsuffix, inquiry row, item snapshots and initial event before hand-off. Include greeting, name, canonical product URL, selected options, message, budget, quantity, occasion, optional pincode and code in a bounded encodeURIComponent message. Read validated international digits-only nonzero-leading WhatsApp number from settings. Render wa.me anchor with target=_blank and rel=noopener noreferrer, Copy message and manual number fallback. Explain user must press Send. Do not put uploads, tracking secrets or unnecessary PII in message URLs; suppress message text from analytics. Logged-in ownership uses trusted session ID; anonymous enquiries are server-created and rate-limited. No automatic status advancement from a link click.

**Login/account:** friendly why-sign-in explanation, Google primary/magic-link backup, verified identity, expired/denied/invalid-token states, safe return route, logout and logout-everywhere. Profile changes cannot alter roles. Saved addresses, wishlist, own enquiries/orders/reviews, data export and deletion; each uses ownership checks, no public caching. Re-authenticate export/deletion and reconcile legally retained snapshots/audit data.

**Enterprise:** value proposition for pens, shirts, mugs, hampers, trophies/welcome kits, genuine client/event gallery, MOQ/lead-time info, steps/FAQ and sanitized admin-uploaded catalogue PDF. Form: organization/name/type college-company-event-NGO-other, contact/role/phone/email, optional GSTIN, multi-item quantities/MOQs, logo/colours/text, deadline, city/pincode, budget range, notes, consent. Server record ENT code, New→Contacted→Quote sent→Negotiation→Won/Lost pipeline, dashboard badge, queued email if configured, then explicit Continue on WhatsApp with code. Logo upload requires login; no-upload guest submission allowed. PDF publication requires a static sanitized document pipeline, not the customer image allow-list.

**Builder:** progressively server-saved authenticated drafts; steps budget/presets, DB-backed gift type, optional occasion/recipient, 500-character personal message with live preview, colours/add-ons with price hints, private photo/logo uploads with camera picker/preview/crop, review quantity/requested date/pincode/contact, submit quote. Budget presets under ₹500, ₹500–1,000, ₹1,000–2,000, ₹2,000+ and custom. Estimates subject to confirmation; validate every step and final submission, detect stale version edits. One CUS code/request from idempotent submission; admin sees uploads by code; WhatsApp cannot attach files. Resume/cancel/reset/delete draft, with retention/cleanup and interrupted-upload handling.

**Tracking:** manual admin states Inquiry→Confirmed→Payment received→In production→Quality check→Packed→Shipped/Out for delivery→Delivered, with On hold/Cancelled/Refunded and validated return transitions. Store actor/time/from/to and customer-visible versus internal notes/photos separately; confirmed price, courier/name/number/allow-listed HTTPS link/ETA; transactional change plus outbox event and version check. Account timeline auto-refresh by no-store polling (e.g. 30s, pause hidden tabs) or reviewed ownership-safe Realtime. Anonymous code+last-four lookup returns coarse status/date only; full guest detail requires scoped verified guest session. Admin Notify on WhatsApp opens customer chat; owner presses Send. Optional queued email; configurable SLA nudges; courier automation later.

**Admin:** mobile-usable desktop-first layout; product create/edit/duplicate/hide/unhide/soft delete/permanent delete and select/bulk/delete-all with confirmation/recent MFA; ordered multi-image uploads, taxonomy/options/pricing/customization/SEO fields; category/occasion rename/reorder/hide; colours/add-ons; order list/search/filter/update/photos/courier/notification; request/enterprise uploads/quotes; review queue/reports; genuine sales-proof/counters; hero/featured/seasonal themes; settings/contact/policies/WhatsApp/templates; dashboard new/stuck/enquiry/top-product/enquiry-handoff metrics; owner-only audit; CSV and backups in Phase 5. Destructive work preserves order snapshots and audit trail.


## 9. Domain model, migrations and authorization matrix

### 9.1 Schema conventions

Use UUID primary keys except deliberately composite join keys; timestamptz created_at/updated_at; UTC storage; named CHECK/UNIQUE/FK constraints; deterministic migration order. All business dates and public IDs have one canonical representation. No user-visible code is the internal authorization credential. Use integer paise with bounded positive quantities and checked arithmetic; distinguish absent price from a genuine zero price. Serialize monetary values without binary floating-point rounding. Use explicit currency INR; a future multicurrency change requires a real conversion/pricing design.

Use versioned migrations created through the installed Supabase CLI workflow after checking its help. No dashboard-only schema that is absent from version control. Enable RLS/grants in the same migration that exposes a table. CI resets a clean staging/local database, applies all migrations and fixtures and tests policies. Generate current types from the schema. Use transactional/backward-compatible changes, deliberate backfills and rollback notes; do not automatically run destructive migrations against production.

Private schema/session/role tables are not exposed through Data API. Public read projections contain only published fields; do not use SELECT * in public responses. Base tables containing contact details, authorship UUIDs or moderation notes do not gain blanket public SELECT because a subset of columns is public. For invoker views, arrange underlying column permissions/RLS intentionally; if that cannot express the required publication safely, use a separate maintained public projection. Test both the view and attempts to read the base table.

### 9.2 Required tables and relationships

| Table or group | Required fields and invariants |
|---|---|
| profiles | auth user UUID, bounded full name/avatar reference/optional normalized phone, verification metadata from trusted source, timestamps; no editable role; signup trigger never copies role fields from user metadata |
| private.admin_users | user UUID, owner/editor, active flag, MFA requirement, role version/revocation info; server/operator only |
| private.app_sessions | token hash, user/audience/provider reference, encrypted provider tokens/key version, assurance/MFA times, issued/idle/absolute/revoked dates and minimal device metadata; only server/session functions |
| categories | UUID, parent FK, unique normalized slug, label, icon reference, order, active; cycle prevention and explicit child hide/delete policy |
| occasions | same plus season date metadata; many-to-many use, original initial order; no inferred season marketing promises |
| products | UUID/unique slug/name/short and long description/materials/dimensions, base/from/max price/INR, customizable/info, lead time, stock status/ready-or-made-to-order, MOQ/enterprise/featured/active flags, publication state, derived rating and count, search vector, SEO metadata, deleted_at/version |
| product_images | product FK, source/private or published sanitized object reference, alt text/order/media dimensions, publication metadata; unpublished draft media never public |
| product_categories, product_occasions | composite product/taxonomy uniqueness, indexes both traversal directions, active-parent reads |
| product_options / option_values | product FK, color/size/addon/text/upload type, stable option/value IDs, required/length/count rules, valid values/price deltas/order/active/version; strict typed JSON only where appropriate |
| reviews | user/product UUIDs, integer rating CHECK 0<=rating<=5, bounded plain-text body, sanitized photo reference, pending/approved/rejected, moderation metadata/deleted_at; UNIQUE(user_id,product_id) across soft deletion |
| review_reports | review/user IDs, reason, created/status/moderator metadata; duplicate and abuse limits |
| wishlist_items | UNIQUE(user_id,product_id), created date; owned access |
| addresses | user ID, label/name/address/city/state/pincode/country/phone and consent as necessary; owned only, no excessive default collection |
| orders | UUID/unique display code, nullable user, source product/builder/enterprise and optional request references, status/version, minimized name/phone/address/pincode/notes, estimate min/max and confirmed total, cancellation/hold metadata, courier reference and requested date/ETA, consent/created/updated/deleted policy |
| order_items | order FK, nullable product FK, immutable historical product name/price/currency/customization/MOQ snapshot, qty, selected typed options, bounded personal message; product deletion does not cascade away history |
| order_events | order FK, actor or operator/system reference, from/to, server time, version, customer-visible fields separate from internal fields, sanitized photo reference, request ID; application-append-only |
| builder_drafts | user UUID, schema/version, validated step payload/current step, estimates with version basis, created/updated/expiry/submitted linkage; no PII client persistence |
| custom_requests | CUS code, owner, draft linkage, budget bounds/type/occasion/recipient/message/colors/addons, qty/date/pincode/contact, quote amount/revisions/status, linked order, policy consent |
| enterprise_inquiries | ENT code, optional user or guest owner scope, organization/type/contact/role/GSTIN, validated item quantities/MOQ/branding, deadline/city/pincode/budget/notes, pipeline/version/quote/linked order, consent |
| request_uploads | owner/user or restricted guest-session reference, exactly one valid parent (draft/request/inquiry/review/order) with DB constraint/FKs, random object path, verified MIME/size/pixel/hash, processing/publication/expiry state; no ambiguous polymorphic ID without integrity checks |
| upload_jobs / upload_tickets | scoped parent/actor/path, reserved quota, expiry/consumed state, content validation status/retries/failure, ready-object reference; single finalization/idempotency and cleanup |
| sales_proof_items | sanitized published image, caption/optional customer first name/city, explicit consent/reference, active/order; no original unredacted chat screenshots |
| site_settings | typed key/value, public/private classification, version/editor/time; public brand/contacts/hero/counters/themes and safe flags explicitly allow-listed; actual secrets in host secret store, never here |
| code_counters | prefix + business-month unique key, next sequence; lock/update atomically, no public grants |
| idempotency_keys | unique actor scope+operation+key, canonical payload hash, transaction status/result reference/expiry; privately readable via authorized server replay only |
| guest_grants | hashed random token, exact record/purpose permissions, expiry/consumed/revoked, optional app guest-session binding; no broad account access |
| notification_outbox / jobs | immutable event/dedup key, channel/template version/recipient reference, pending/leased/retry/done/dead-letter, attempts/lease expiry; minimal PII and encrypted data if needed |
| status_sla_rules | status thresholds/business timezone/active and optional owner reminder settings |
| consent_records | actor or scoped guest/record, purpose/policy version/time/channel, withdrawal state and legal basis metadata; no meaningless blanket consent |
| audit_log | actor/action/entity/ID/request ID/role, redacted permitted diff/timestamp/minimal hashed or truncated IP/device data, append-only for application roles, owner-only reads |

Add Phase 8 payment/invoice/shipment/inventory/coupon/tenant tables when the selected feature is actually implemented, with migrations and tests. Do not expose speculative unused integrations in Phase 1.

### 9.3 Reads and writes by actor

| Actor | Permitted reads | Permitted mutations |
|---|---|---|
| Public visitor | Published active catalogue/taxonomy, safe settings, approved review display fields/aggregates, consented proof | Only authorized BFF guest enquiry/contact/enterprise-without-upload operations and minimal tracking lookup |
| Verified customer | Public data plus own profile/addresses/wishlist/reviews/drafts/requests/linked orders and customer-visible events | Owned BFF functions only; never direct business-table DML |
| Guest receipt/grant | Only the explicitly scoped record/projection for that active grant | Only its explicitly allowed actions; cannot claim arbitrary records or assign registered user IDs |
| Owner admin before MFA | MFA/enrollment/recovery/session endpoints only | No business/admin state changes |
| Owner admin after valid MFA | Authorized full business views and owner audit with current session | BFF owner operations with step-up where required; server-only checked transaction functions |
| Scoped editor after MFA | Only permitted admin module fields, no owner audit/session-token exports | Explicit editor matrix; no roles/payment integrations/WhatsApp-number change/permanent bulk deletion or personal-data exports unless owner consciously grants and tests a narrower capability |
| Job worker | Only job-required data via trusted server role/functions | Job identity+lease/event-specific mutations; cannot simulate customer/admin identity by caller payload |

This matrix describes permitted application behavior through the BFF. Direct unprivileged private reads/writes are denied even for the legitimate owner; safe public projections are the only direct browser database reads. The server-only read function and BFF enforce private ownership/session/field boundaries. Children inherit parent visibility/ownership, including direct object/detail queries. An owned order response must not include internal notes merely because the customer can read its order row. Use separate internal records/projections and database grants. A user can read their own pending/rejected review but cannot see another user’s private moderation context. Public reviews expose a display first name plus date/rating/body/public sanitized image only, not account UUID/email/profile phone.

Database constraints complement API schemas: quantity positive bounded integer; budgets/prices ordered and nonnegative where known; rating 0–5; valid enum/state; parent ownership/integrity; unique review/wishlist/code/idempotency keys; consistent currency; no invalid negative price delta resulting in negative total. Inactive/deleted product options are not acceptable on new enquiries.

### 9.4 Deletion and historical records

Soft-delete catalogue products/reviews by default. Permanent catalogue deletion may remove eligible product content/images/options/joins, but order_items snapshots remain and product FK becomes null or a retained tombstone deliberately. Do not cascade delete orders, audit or events because a product or account was removed. Audit/event app-role immutability is not a claim that a privileged database operator cannot modify storage.

Privacy erasure is a separate audited workflow: revoke sessions/grants, delete private files/eligible rows, anonymize or retain narrowly required business records under documented legal basis, remove public copies under business control and let encrypted backups age out under the approved schedule. A privileged retention/anonymization process may alter eligible stored personal data without fabricating past events; document its authority and evidence. Soft-deleting a review never creates a loophole for a second review: restore/edit the existing row and re-moderate it.

### 9.5 Indexes and query planning

Unique slugs/codes and composite joins; indexes on product filter fields/price/created/rating guided by actual combinations, parent and reverse join keys, orders(user_id,created_at), orders(status,updated_at), events(order_id,created_at), drafts(user_id,updated_at), idempotency scope/key and jobs state/available_at. Use partial active/nondeleted product indexes where useful and GIN full-text search with maintained tsvector. Do not create every possible index blindly. Examine EXPLAIN/ANALYZE in staging with realistic distributions/10k-product fixtures, not production customer queries pasted into AI chat. Avoid N+1 image/options queries and unbounded JSON aggregates. Use verified pooling for direct SQL, bounded HTTP queries for serverless execution and stable pagination.


## 10. API contracts, validation and failure behavior

### 10.1 Endpoint families

Exact paths may use versioned route handlers or server actions, but document an equivalent typed contract for all of these:

| Family | Authentication/authorization | Key behavior |
|---|---|---|
| GET public products/search/detail/taxonomy/settings | Public-safe projection only | Bounded query params/page size; active parent; public caching without Set-Cookie |
| POST auth start/callback/confirm/logout | Provider state/session checks | PKCE, generic responses, anti-CSRF where appropriate, safe returns, rate limits |
| GET/PATCH profile/addresses | Verified owned app session | Field allow-list; current identity and ownership; no role writes |
| POST product enquiry | Guest scope or verified session | Turnstile, schema, rate limit, settings readiness, atomic idempotency |
| GET/PUT/DELETE builder draft | Verified owner | Versioned autosave, expiry, ownership and quota |
| POST builder final submit | Verified owner | Full revalidation, Turnstile, atomic CUS/linked draft state |
| POST enterprise/contact | Guest or verified; login for customer uploads | Strict form limits, Turnstile, atomic record/outbox, consent |
| POST/PATCH/DELETE review/report/wishlist | Verified owner; admin moderation separately | Unique constraints; zero-rating support; edit resets pending; report abuse limits |
| POST upload issue/finalize/delete | Verified owner or explicitly allowed administrator | Parent/path/quota/session binding, no arbitrary object paths, private quarantine |
| GET private media | Current owner or scoped admin/grant | Per-request authorization, correct media type/private no-store; no public image optimizer cache |
| POST public track | Public with challenge/limits | Minimal status/date only, generic failure; no caching/PII |
| GET owned orders/events | Verified owner or scoped guest session | Customer-visible projection; no-store polling |
| POST account export/delete/session revoke | Verified current user plus appropriate recent verification | Data minimization/retention, revoke grants/tokens, private expiring artifact |
| Admin catalogue/taxonomy/media/settings/proof | Current role+aal2; step-up when needed | Explicit module permissions/versioning/audit/cache invalidation |
| Admin status/quotes/moderation/metrics/audit/CSV | Current scoped role+aal2; owner-only where specified | Transactional business checks; safe projections/import/export |
| Job/webhook endpoints | Verified job/provider identity, not browser cookies | Signature/time/replay protection, scoped action/idempotency/leases |

Do not expose a generic “execute query”, “update row”, “sign any file” or service-role proxy endpoint.

### 10.2 Validation and response rules

Server Zod schemas are strict and reject unknown keys, not mass-assign payloads. Normalize phone/pincode/slug/colour IDs consistently and preserve display text separately. Suggested defaults: personal message 500 Unicode code points; review/notes 2,000; product name 120; search 100; pagination 24 default/48 maximum; at most 20 selected option values; bounded qty 1–10,000 subject to product/business rules; explicit configurable upper limits for budget/price. These are implementation defaults, not claims about actual stock or MOQ. Count limits consistently server/client; byte/request caps also apply.

Store customer/review messages as plain text and escape on output. Do not strip arbitrary characters as a substitute for escaping or render their HTML through dangerouslySetInnerHTML. Sanitize any future rich text with an audited allow-list. Serialize JSON-LD safely against closing-script injection. Never eval content. Validate all URL schemes/domains; do not fetch arbitrary user-supplied URLs. Product media references are controlled storage IDs, not a server SSRF fetch feature. Treat CSV content and extracted document text as untrusted data, not instructions.

No client trust for user ID, role, rating aggregate, approval state, product snapshot price, confirmed total, source of payment, order code, uploaded_by, object path or grant scope. Server derives them. Disallow unknown sort values, excessive filter lists, unsafe wildcard/full-text expressions and negative/NaN/infinite numeric input.

Use semantic response/error contracts: 400/422 safe field errors, 401 missing/expired session, generic 403 or nonenumerating 404 where appropriate, 409 stale version/idempotency conflict, 413 large payload, 429 temporary rate limit with sensible Retry-After, 503 required protection/provider unavailable. Do not reveal raw SQL/table names, stacks, private IDs, email existence or Turnstile internals. Include a nonsensitive correlation ID. Use no-store for private/security failures and prevent caches from mixing user responses.

### 10.3 CSRF/CORS/limits

All cookie-authenticated mutations require a verified same-origin request and CSRF token or a supported equivalent with documented guarantees; SameSite alone is defense in depth. Check content type and methods. Server Actions must perform the same guard rather than rely only on framework routing. Exact-origin CORS if needed; no wildcard with credentials. Webhook/provider callbacks follow their separate signature/state protocol and are not disabled by an inappropriate generic browser CSRF rule.

Use distributed atomic IP+actor/entity+global limits; trust forwarded IP only from configured ingress. Minimize stored IP data using an appropriate keyed hash/window scheme and retention. Proposed starting budgets must be tuned with real staging tests:

| Operation | Starting limit / special rule |
|---|---|
| Auth primary/MFA/recovery | 5/minute/IP plus 10/hour account-hash; progressive backoff, generic response, tested owner recovery |
| New product enquiries | 5/10min/IP plus 20/day user or guest actor; global cost circuit breaker |
| Enterprise/contact | 3/hour/IP plus actor quotas; no unrestricted free email spam |
| Review/report submission | 5/hour/user; report-per-review deduplication; stricter abuse throttle |
| Draft autosave | 30/minute/user, debounce; quotas on draft count/bytes |
| Upload issue | 10/hour/user initially; byte/count reservation; normal 5-file request fits quota |
| Tracking | e.g. 5/15min/IP plus per-code progressive threshold; do not create a permanent global code lock attackers can exhaust |
| Admin sensitive mutations | Role/action/session limits in addition to login limits and step-up |

Fail closed for new sensitive writes if required distributed protection is unavailable; keep safe browsing available if possible. Return truthful retry/help UI. Do not silently use a per-process memory limiter as production fallback. Completed idempotent replay may return its already-authorized stored safe result without repeating side effects; it must not become an authorization bypass.

Server-verify Turnstile token/action/hostname/expiry/replay on auth/form submissions where configured. Use the provider-supported integration for managed Auth when direct provider endpoints would otherwise bypass the BFF challenge; verify its actual compatibility. Turnstile is not identity and does not replace rate limits. For drafts/upload-ticket interactions, a short-lived challenge-verified session and risk-based revalidation can avoid a new challenge for each autosave; final enquiry/review/builder/enterprise/track submission uses fresh required validation. Never hard-code a production challenge bypass. CI may use explicitly test-only provider keys isolated from production; secrets/flags cannot activate a public bypass.


## 11. Product enquiry, code generation and WhatsApp handoff

### 11.1 Atomic create algorithm

1. A product page loads only current published product/options and truthful estimates. A visitor chooses options/quantity/message/occasion/budget/optional pincode/contact, reviews the privacy notice and submits. Require only necessary fields; a guest can inquire without giving a phone, but then code+phone tracking is unavailable.
2. Establish a minimal secure guest scope for anonymous requests or verify the registered session. Guest scope is not a customer account. Generate a cryptographically random idempotency key per explicit submission; the backend scopes it to actor+operation and hashes a canonicalized semantic payload. Phone/email/price/role are not authoritative actor identifiers.
3. Verify CSRF/origin, schema, settings readiness, limiter and challenge. If a completed same-actor/key exists, reauthorize access and return its safe result for identical semantic payload. Different payload with the same key gives 409. Challenge tokens are transport/anti-abuse data, excluded from semantic payload hashing; a successful retry does not try to reuse an expired single-use challenge as a new create.
4. In one database transaction: recheck active product/options/MOQ; calculate estimate from trusted values; allocate prefix/business-month counter; create human-friendly code; insert enquiry/order with status inquiry, snapshot order_item, initial event, consent linkage and idempotency result. Lock/update counter atomically, unique code/idempotency constraints. Never MAX()+1, client-generated authoritative code or separate uncoordinated writes.
5. Code format example: GFT-2610-000042-7K3T6N9Q2R5W. Prefix distinguishes GFT/CUS/ENT; month uses configured business timezone; sequence width is minimum formatting, not a finite capacity. Use at least 12 cryptographically random Crockford-base32 suffix characters and collision retry bounded by the unique constraint. The code remains an identifier, not strong authorization.
6. Commit before external handoff. Record attempts/analytics separately after commit. Generate message from committed snapshot and current validated business destination. If destination changed or becomes unavailable after commit, keep enquiry and show a retry/contact state; never discard/duplicate it silently.
7. Render explicit “Continue on WhatsApp” anchor plus Copy message/manual-number fallback. A real user click after server success avoids unreliable asynchronous popup permission. Use target=_blank and rel=noopener noreferrer. Do not try to detect installed WhatsApp by unsupported browser tricks or claim to know if the message was sent.

### 11.2 Message contents and privacy

Use `https://wa.me/<international-digits>?text=<encodeURIComponent(message)>`. Include greeting, product name/canonical product link, selected colour/size/add-ons, bounded personal message, budget if supplied, quantity, occasion, optional pincode and display code. Example wording may be warm and editable; treat template variables as plain text, validate placeholders and length, and never allow a template to inject arbitrary URL schemes or destinations.

No uploaded files can be attached automatically by wa.me. State that the owner can see private uploads by request code in admin. Do not put private image URLs, account tokens, full recipient address, account credentials, guest access secrets or unnecessary personal data in the URL. Inform the visitor that included personalization is shared with WhatsApp when continuing. Keep message URLs out of application logs/analytics/session replay. External WhatsApp/browser processing is outside this site’s guarantees.

Bound message length using tested target-device URLs; choose a configurable conservative limit (e.g. 1,500 Unicode characters after constructing human-readable text), then preserve essential code/link/item summary and offer full summary copy/download if needed. Never cut through percent encoding or silently omit required recorded options; the database is the full authoritative request. Verify actual Android/iOS/desktop behavior.

The website can observe enquiry creation and a best-effort continuation click event. It cannot observe sending, owner response, actual payment, shipment or receipt without manual admin records or later verified integrations. Floating general-chat links are clearly distinct from product enquiries and need not manufacture an order record.

### 11.3 Quote and payment facts

An estimated price is labelled “Estimate — final price, customization and shipping confirmed on WhatsApp.” Show shipping/tax inclusion only when known. A quote revision records actor/version/amount/conditions/validity; it does not overwrite an item’s historical snapshot. Owner confirmation of offline payment is auditable but is not equivalent to an automatically reconciled bank/provider transaction. Do not mark paid from a customer-entered reference or uploaded screenshot alone without owner verification.

For custom/enterprise requests, submit CUS/ENT once; quotation-to-order conversion records linkage and is idempotent. Do not create a new record every time the customer opens the same existing Continue on WhatsApp link. Multiple deliberate new submissions can be allowed under quotas with distinct request keys; make this clear to the customer.


## 12. Reviews, identity, ratings and public trust

Use a rating input supporting deliberate values 0,1,2,3,4,5 and an independent null/no-selection state. It must be keyboard and screen-reader usable, with an explicit zero-star option. Require explicit selection before submit; never initialize a stored review at zero just because the customer did not interact. Database stores integer 0–5. Unrated products have review_count=0 and avg_rating null, not 0 by assumption. A truly zero average with approved zero ratings is displayed as 0/5 with its nonzero count.

One review row per account/product, including deleted/pending/rejected rows, enforced by UNIQUE. Server sets user from verified session and product from validated current item. A customer can edit/delete their own review; editing rating/body/photo returns the row to pending and removes it from public aggregate until reapproved. Nonreview metadata edits, if any, must not expose moderation fields. Public output contains first display name/date/rating/body/sanitized approved photo, no user UUID/email/private status/reason/history.

All moderation transitions and aggregates happen transactionally or through a rigorously maintained derived projection with tested eventual-consistency behavior. Keep avg/count/distribution consistent for approvals/rejections/edits/deletion/restoration/concurrent moderator actions. Report review uses a reason and abuse-limited unique reporter/review action; report count alone does not automatically expose reporter or arbitrarily delete competitors’ reviews.

Require deliberate consent to publish a review photo after sanitization. Private source stays private; public copy is available by URL once published. On removal delete the business-controlled public copy, invalidate caches where supported, and document that previous downloads/browser copies cannot be recalled. Do not claim strict instantaneous takedown based only on changing review status.

Structured rating markup must match real approved displayed data and the supported platform schema. With zero-star ratings, declare the correct scale where supported and verify current rich-result rules; omit incompatible aggregate markup rather than convert zero to one, falsify the average or imply eligibility. Keep visible 0–5 feature regardless of third-party rich-result restrictions. “Verified purchase” requires a linked genuine completed purchase record and transparent moderation policy; membership alone is insufficient.

Sales-proof and testimonial sections use genuine data only, with owner publication consent/redaction workflow. Hide empty counters/gallery rather than display fabricated 1,000+ customers. Avoid revealing customer phone numbers, faces, addresses or full WhatsApp screenshots. Represent client logos/past events only with actual evidence/rights.


## 13. Builder, enterprise workflow and private upload lifecycle

### 13.1 Builder details

The eight stages are budget; DB-backed gift type; optional occasion/recipient; personal message/live preview; colours/add-ons; optional photos/logo; review contact/quantity/requested date/pincode; submit for quote. Budget presets under ₹500, ₹500–1,000, ₹1,000–2,000, ₹2,000+ plus custom; configure boundaries clearly so exactly ₹500/₹1,000/₹2,000 do not fall through two conflicting rules. Allow optional recipient fields without collecting children’s full identities/addresses unnecessarily.

Draft autosave is server-side owned data. Use schema_version and optimistic version. Debounce, show saved/saving/error state and preserve in-memory edits on temporary failure; do not report saved until server acknowledgement. A stale tab receives a conflict and safe reload/merge choice rather than silently overwriting another device. Save step validity/progress but revalidate all final fields and file readiness at submit. Support resume, back/next, reset/cancel/delete/expiry and keyboard focus/errors. Do not keep drafts or contact/photo data in localStorage/sessionStorage.

Text preview is plain escaped text and illustrative layout; it is not a guarantee of final handmade output. Product choices/add-ons/colours/MOQ/lead-time come from data. Server estimate references a pricing/configuration version; stale option/price on final submit produces a review step, not an undisclosed price change. Requested delivery date is validated against known lead time and explicitly subject to owner confirmation.

Submitted draft cannot create another request on retries. Keep its linked CUS request and allow controlled follow-up revisions as separate versioned quote updates. Switching gift type must explicitly clear incompatible options/uploads after warning, not leave hidden invalid selections.

### 13.2 Enterprise details

Landing explains custom pens, shirts, mugs, hampers, trophies, welcome kits, MOQ/lead-time and genuine past work. Form captures organization name/type (college/company/event/NGO/other), contact person/role/phone/email, optional GSTIN, selected items and per-item quantities, branding logo/colour/text, deadline, delivery city/pincode, budget range and notes. Validate every required field and consent. No-upload guest submission permitted; private customer-logo upload requires verified sign-in by default.

ENT record pipeline: new → contacted → quote_sent → negotiation → won or lost; allow documented reopen/requote with reason/history. Record won on genuine owner-confirmed agreement, not on a wa.me click. Quotation revision/terms and linked order are versioned, and won→order conversion is idempotent. Dashboard badge is immediate from DB; email is optional outbox status, not fake success if no sender setup exists. Continue on WhatsApp is a user action, not an automatic notification.

Downloadable catalogue PDF is an owner-managed public published document. Allow only admin upload with step-up/size cap (proposed 10 MiB) to a private document-staging path, validate PDF signature/parse with bounded resources, remove/reject active content/embedded files/actions or use a proven static rendering/regeneration pipeline, and require owner preview before publication. If a safe PDF sanitizer/renderer is unavailable, disable new PDF publication and expose an honest blocker or generate a static server-owned catalogue from safe data. Never apply the customer photo MIME allow-list blindly to this separate document flow. Any existing externally supplied catalogue URL is only linked after HTTPS/domain/ownership review, not fetched arbitrarily by the server.

### 13.3 Image upload state machine

State: issued → uploaded_quarantine → processing → ready_private → attached/submitted, with rejected/expired/deleting/deleted side states. Public copies are a separate explicitly approved publication action. Database records and storage operations cannot be one atomic transaction; use idempotent job transitions, content-addressed or randomized immutable outputs, cleanup/reconciliation and safe intermediate states.

1. Authorize actual parent and actor, require session/challenge freshness as appropriate, validate declared type/size/count but do not treat declaration as proof.
2. Reserve per-request/per-user byte/count quota atomically so concurrent tabs cannot each consume the full limit. Default at most five files, 5 MiB each, 25 MiB total and 20 megapixels decoded/file; configure tighter global/user/day limits according to actual cost plan. Reject file-count mismatches and extension tricks.
3. Issue an exact randomized object-path upload capability to a private quarantine bucket or stream to a bounded server ingress. No arbitrary path, overwrite/upsert, listing or cross-owner parent. If signed-upload provider TTL/one-time behavior differs, enforce ticket state at finalize and do not claim the provider URL itself became single-use.
4. Browser uploads directly to the exact authorized private Storage path by default, with byte cap and progress/retry/cancel UI; a 5 MiB input must not be routed blindly through a hosting function with a smaller body limit. Server finalize/job fetches the real object, verifies stored byte length and allow-listed magic bytes, fully decodes using maintained JPEG/PNG/WebP decoders, enforces pixel/frame/CPU/memory limits, strips EXIF/GPS and re-encodes to a known safe output. Reject animations or bound total frames; never process an unbounded decompression bomb. Validate that the selected job runtime supports the native decoder/memory/CPU and actual host request/response limits. Produce bounded preview derivatives (proposed <=2 MiB and <=2,048px longest side) for ordinary authenticated proxy display, and deliver larger originals only through a reviewed streaming-capable private runtime or explicitly tested acceptable grant path; never exceed host body limits and silently fail. HEIC only with verified supported server decoder in the selected runtime; otherwise clear conversion guidance.
5. Reject SVG/HTML/executables/active documents and disguised/polyglot files that fail safe decode/re-encode. No customer PDF uploads in the image flow. Browser crop/compress is convenience, not validation. Optional antivirus is added if cost/runtime supports it, without treating it as a replacement for content validation.
6. Promote only processed output to ready_private and attach it through a transaction checking current parent ownership/state/version. Keep failed/unfinalized objects unviewable by business/customer gallery; private storage administrators may still operate the quarantine under restricted identity.
7. Discard unnecessary originals after successful safe processing according to policy; preserve normalized source only where needed. Delete orphan quarantine after 24h and expired drafts after 30d by proposed defaults. Customer source photos default delete 90d after delivery/closed request, including normalized copies and grant revocation as defined by owner/legal policy. Track stuck jobs/dead-letter/retry and idempotent delete reconciliation.
8. Product draft images start private; owner explicitly publishes sanitized product versions to public-media. Customer review/proof publication additionally requires consent/moderation. A public-bucket file is readable by anyone with its URL and may be cached independently of product visibility. For truly confidential catalogue media use a private design and adjust performance/caching explicitly.

### 13.4 Private delivery and signed links

Default private media is delivered through an authenticated BFF media endpoint with per-request ownership/admin/grant validation, correct image Content-Type, nosniff, private/no-store cache controls and no shared CDN caching. Do not send it through a public Next image-optimization route that would cache it as ordinary public media. Use unoptimized/private image rendering or a reviewed authenticated image pipeline. For downloadable originals, use an attachment disposition; only known safe re-encoded images render inline.

If using a temporary download link, implement a standard-library signed or securely random hashed server grant scoped to file/purpose/session with a short proposed 5-minute lifetime. The application proxy checks active grant and current session/permissions before each download. Raw token URLs must not enter analytics/logs/referrers. Prefer authenticated same-origin GET for ordinary previews to avoid bearer tokens in URLs at all. Cross-origin media delivery needs an explicit cookie/ticket/CORS design; do not assume host-only app cookies reach another origin.

Provider signed-storage URLs are optional for cases that tolerate bearer access during documented lifetimes/cache effects, not the default for sensitive customer originals. Verify exact provider signed-token expiry/revocation/CDN behavior; do not state a URL becomes inaccessible at expiry without testing. Avoid shared caching, purge/delete business-controlled objects when revocation requires it, and state browser/downloaded-copy limitations. An expired grant cannot revoke already downloaded bytes.


## 14. Order state machine, tracking and notifications

### 14.1 Operational state model

The main path is inquiry → confirmed → payment_received → in_production → quality_check → packed → shipped → delivered. Display “being customised” and “out for delivery” as appropriate labels/substates without creating ambiguous stored values. Side states are on_hold, cancelled and refunded. A local-delivery workflow can use a documented out_for_delivery substate; do not invent a courier tracking number when the owner delivers directly.

| From | Normal next state | Preconditions / exceptional handling |
|---|---|---|
| inquiry | confirmed, on_hold, cancelled | Confirm agreed scope/quote and minimum contact needed; no payment inferred |
| confirmed | payment_received, on_hold, cancelled | Owner verifies actual offline receipt; partial/deposit terms recorded explicitly |
| payment_received | in_production, on_hold | If ready-made workflow skips production, permit quality_check/packed only with documented allowed rule/reason |
| in_production | quality_check, on_hold | Record intentional production update; no automation assumption |
| quality_check | packed, in_production, on_hold | Failed check may return to production with reason/history |
| packed | shipped/out_for_delivery, on_hold | Require actual dispatch evidence; courier/ETA if applicable |
| shipped/out_for_delivery | delivered, on_hold | Owner confirmation/courier evidence; no assumption that link click means delivery |
| on_hold | saved prior valid operational state, cancelled | Resume reason and current validation; do not reset payment facts |
| cancelled | controlled reopen or refund workflow | Reason and authorization; reopening requires audit/retained history |
| delivered | refund workflow or specific audited correction | Do not silently roll back delivery from a late webhook |
| refunded | terminal full-refund business state by default | Actual owner/provider-verified refund; partial refunds stay separate amounts/ledger, not fake full refund |

Payment facts and fulfilment state must not be conflated. If the business accepts deposits, distinguish deposit received from fully paid in payment fields and customer wording; never label a partial deposit “paid in full.” Record offline payment amount/date/reference/verification actor separately from the visual milestone. No claim that a refund was executed by this site in the offline phase. If a paid cancelled order still needs money returned, show an internal refund_due task; do not mark refunded automatically. Phase 8 payment/shipment ledgers become the authoritative integrated financial/shipping state; the customer timeline remains a faithful derived operational view.

State update function: validate live admin session/role/recent step-up if needed, lock/check expected order version, verify allowed edge/preconditions, update state/version and immutable event/customer/internal note separation, append audit and outbox record in one transaction. Use idempotency for replayed status requests; a stale concurrent update returns 409 with safe refresh. Never overwrite the last event because the admin corrected a typo; use an explicit correction event or permitted separate note revision with audit.

All estimates/quotes/confirmed totals preserve history. A contact address is collected when needed for fulfilment, not exposed in inquiry URLs. Courier names/tracking links are validated HTTPS with approved domains; links are not blindly fetched by the backend. Internal notes/photos/quality issues are private by default; deliberate customer-visible attachments require sanitization and authorization.

### 14.2 Customer and guest tracking

/orders and /orders/[code] require a verified owner session, or a separately scoped guest view where explicitly supported. Return only customer-visible fields. Poll no-store endpoint around every 30 seconds with backoff, pause hidden tabs and show offline/error timestamps. Polling does not count as admin activity or prove a new status. Direct Realtime is optional only after a reviewed BFF-compatible authenticated subscription design with tested channel/RLS isolation; never expose provider refresh tokens just to implement it.

/track accepts a POST code + last four of normalized stored phone + server-validated Turnstile. Do not put phone in a shareable query string or GET logs. Use random-suffixed codes, length/format checks, constant-time comparison of fixed-size normalized/hash values where appropriate, uniform invalid response, strict layered limits and abuse alerts. Constant-time string comparison does not make the entire network endpoint timing-independent; do not claim it prevents all enumeration. Return only coarse current status plus updated calendar date. No name/address/full phone/photo/personal note/internal event history/courier details/organization/GSTIN. Even coarse status is private context if the code leaks; explain limitations and provide a way to opt for account-only tracking if the business needs stronger secrecy.

An inquiry with no stored phone is not eligible for code+phone lookup. Never let phone-last-four lookup become a credential to view rich history or claim an account record. Guest receipt at successful creation can establish an exact-record cookie/session grant; recovery by a new browser needs a separately verified channel or owner-issued high-entropy scoped link. Generate at least 256-bit random token, store hash, limit purpose/record/expiry, exchange for a secure no-store guest session then remove token from visible URL if link-based. Use no-referrer on token pages, suppress analytics, revoke on account claim/closure/expiry and never include the token in a public wa.me message template.

Set a configurable bounded guest-receipt/session lifetime (proposed 7 days) and deliberate renewal/recovery policy; do not issue permanent bearer links. A rich guest session may show only the same permitted customer-visible fields for that exact order, never user account/profile, other orders or admin internals. Claiming a guest enquiry into an account requires verified possession of the specific receipt/grant or a verified full contact challenge; login plus matching typed phone/email is insufficient. Prevent two accounts claiming it concurrently, audit claim and revoke obsolete grants atomically.

### 14.3 Notifications and SLA nudges

Each admin state change may show an explicit “Notify on WhatsApp” button to the customer’s voluntarily supplied normalized phone, with code and minimal update. Owner presses Send. Do not automatically open a popup merely by changing state. Show missing/invalid customer-phone state. Any link is the public safe /track entry or a properly restricted customer account route, not a leaked rich-access token.

Email is optional, requires configured sender/deliverability and appropriate processing/consent basis. Queue after transaction via deduplicated outbox; track queued/sent/provider-failed states accurately, retry with backoff and dead-letter handling. A provider accepted message is not guaranteed delivered/read. WhatsApp API automatic notifications and courier API events belong to Phase 8.

SLA rules are configurable elapsed-business-calendar or elapsed-clock rules chosen explicitly. Highlight records stuck beyond threshold in admin with last meaningful status update, not last page view. Avoid repeatedly spamming unchanged records; notification deduplication/cooldown and business timezone apply. Dashboard should separate new enquiry, confirmed order, payment fact and fulfilment count.


## 15. Search, filtering, caching, SEO, performance and PWA

### 15.1 Catalogue semantics

All taxonomy, gift types, colours, add-ons and occasion order originate from data. Products can have multiple categories/occasions. For a parent category/occasion define whether child descendants are included; default include active descendants, with cycle-proof traversal and tested de-duplication. Counts reflect the same published dataset and chosen faceting semantics. Explain whether a filter’s own current selection is excluded from its count calculation; pick one consistent standard and test it.

URL query schema covers category IDs/slugs, min/max price, rating threshold, customizable flag, colour IDs, ready/made-to-order, stock, combos, sort and page. Normalize stable ordering, reset page when filters change, preserve back/forward/share, reject unknown/oversized values. Avoid invalid min>max ranges; offer clear reset. Use one stable server sort with ID tie-breaker: featured/relevance (search rank when searching), low/high price, newest, top rated with count basis, and best-selling from recorded confirmed/delivered quantities with a documented window. Do not invent sales ranking from clicks. New products with no reviews sort distinctly from actual zero-rated products.

Use 24/page default, max48, bounded suggestions, ranked tsvector search, indexed joins and a 2/3/4 responsive grid. Numbered accessible pagination is default; if infinite scroll is added retain server-addressable page URLs and navigation/SEO fallback. Only published option/media projections go public. Fetch filters and products server-side, not all 10,000 rows into browser memory. Skeletons/errors must not shift card layout or leave focus trapped in a drawer. Empty state suggests reset/browse and builder only when enabled.

### 15.2 Cache boundary

Public catalogue render is deterministic from safe published data and does not read/refresh session cookies or set cookies. Personal navbar/wishlist/account state is loaded separately from private/no-store APIs or isolated dynamic rendering. Never publicly cache a response with Set-Cookie, authorization-dependent content, grant token, tracking result or signed/private file URL. Avoid one generic cached function that closes over a request session.

Define cache tags/keys for product/taxonomy/search aggregates/approved review/settings. Invalidate/revalidate on publication, price/options/visibility/moderation/taxonomy edits and deletion; handle stale page and stale CDN media behavior explicitly. Preview mode is authenticated/admin-only and no-store, not a public draft leak. An ISR cache revalidation delay must not allow new orders with retired product/price/options because transaction-time checks remain authoritative.

Use immutable versioned public-media URLs for new processed versions, reserve dimensions, responsive WebP/AVIF where supported, priority only for actual LCP visual and lazy-load below fold. Public media may persist in caches; never use published URLs for confidential uploads. Background image optimization must not fetch arbitrary external URLs.

### 15.3 SEO and honest structured data

Canonical home choice with /home redirect/alias, canonical public product/taxonomy URLs, truthful title/description/Open Graph, breadcrumbs and published-only sitemap. Define robots/index/noindex rules for search/filter variants to avoid combinatorial duplicate indexing. Do not advertise private admin path in robots. Private account/orders/track/admin/auth/token pages are noindex and excluded from sitemap; indexing policy is not access control.

Safe JSON-LD uses genuine product properties and only supported, accurate pricing/availability. If all prices require quotation, do not invent a fixed in-stock Offer/checkout claim just for rich results. If valid zero-star reviews cannot satisfy target rich-result rules, omit incompatible aggregate markup; never alter stored ratings. Handle unavailable/deleted products with deliberate redirect/404/410 rules, not leaking hidden catalogue or always soft-200 errors. Validate production canonical origin; previews noindex and cannot become canonical production accidentally.

### 15.4 Performance and device evidence

Measure mobile Lighthouse targets >=90 Performance/Accessibility/Best Practices/SEO with documented throttling/device/test date, LCP <2.5s goal on a realistic mid-range Android/4G profile and layout stability/interaction responsiveness evidence. Scores vary by run; record representative runs/conditions and unresolved gaps rather than select a single flattering screenshot. Do not promise identical timing across networks/devices.

Inspect bundle size, server/database query latency, media sizes/fonts and cache behavior before optimizing. Use font-display swap/self-host, lazy Devanagari language font, accessible control behavior with JavaScript loading failures and robust forms. Cross-browser matrix includes actual iPhone Safari dynamic toolbar/safe-area/sticky controls, Android Chrome, Samsung Internet, macOS Safari, Windows Chrome/Edge and Firefox. Emulated WebKit covers some engine cases but is not a real-device certification. Explicitly report unavailable browsers/devices.

### 15.5 PWA, offline and consent

PWA installability includes valid manifest, real icons/theme colour, HTTPS/service worker where required, update behavior and accessible offline fallback. Browser support differs; do not promise identical install prompts on iOS/Android/desktop.

Default service worker caches only explicit versioned safe public static assets and an offline page. Exclude authenticated HTML/API, admin/auth callbacks, all tracking, private media, grants, tokens and responses with cookies/authorization. Do not add broad cache-first navigation. No offline queue of customer uploads/contacts/enquiries in browser storage by default. An offline button must not display “submitted” before actual server acknowledgement; if later adding offline queueing, specify encryption/privacy/idempotency and consent before implementation.

Optional analytics is off until the owner chooses tool/legal consent basis and configures it. Where consent is required, reject/withdraw as easy as accept and no analytics before consent; essential session/CSRF cookies have separate truthful disclosure. Event data excludes personalization/phone/email/address/token/signed URL/photo/message. Genuine Google Business/Instagram link-outs only; no invented profiles. Hindi/Marathi are optional Phase 6 additions with routing/translation catalogs/Noto Sans Devanagari/INR-date formatting/hreflang/canonical behavior, reviewed policies and visible English fallback. Language support is not “complete” because a selector exists.


## 16. Security, privacy, operations and measurable release gate

### 16.1 Secrets and supply chain

Ignore .env* from first commit except sanitized .env.example; no actual value in client code, comments, unused files, public maps, screenshots, fixtures, reports or full Git history. Run gitleaks or equivalent on working tree and complete available history; if history is shallow, fetch only when authorized/possible or report history coverage incomplete. Rotate any exposed credential, including one removed from the current commit. Service-role/secret keys are never NEXT_PUBLIC_; public URL/publishable key/Turnstile site key are explicit nonsecret exceptions. Use separate secret stores/environments and a reviewed 90-day credential review/rotation policy compatible with provider mechanisms; never claim rotating one key revoked all sessions if it does not.

Verify package existence/provenance, pin maintained compatible versions, commit lockfile, remove unused dependencies/demo endpoints/default credentials. CI includes typecheck/lint/build, secret scan, npm audit/dependency scanner, Semgrep OWASP-relevant rules and Dependabot/Renovate. Fix high/critical findings affecting release; review lower-risk findings and document narrowly reasoned exceptions instead of mechanically ignoring them. No unsafe eval/arbitrary code/content execution or unreviewed remote scripts.

### 16.2 Transport and headers

HTTPS redirect, valid TLS, staged HSTS. Enable includeSubDomains/preload only after all covered hosts are HTTPS-ready and the owner accepts the long-lived implication. Test CSP against actual Next version/rendering model/Turnstile/font/media requirements; use nonces/hashes where appropriate, no unsafe-eval, strict script/connect/image/frame source allow-lists. Nonce-bearing private responses and public ISR require a compatible strategy; do not cache a random nonce response and independently generate mismatching headers. If unavoidable inline framework behavior needs a documented exception, record actual residual risk and mitigation instead of claiming a perfect policy.

Set CSP frame-ancestors 'none' and X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin or stricter on secret-bearing pages, conservative Permissions-Policy with microphone/geolocation off unless required. Standard mobile file-picker capture may work without getUserMedia; do not request camera/mic permissions globally. If a live camera feature is implemented, scope permission/feature use to upload flow and provide file-picker fallback.

No public production stack traces/debug output/default credentials/source maps. Private source-map upload to scrubbed monitoring is allowed only with controlled access. SRI for applicable fixed third-party assets, minimal third-party runtime scripts; admin has no marketing analytics/replay. Configure Cloudflare DNS/proxy/WAF/bot/DDoS/rate/optional Access only after verifying actual supported plan and hosting compatibility, TLS/origin rules and cache exclusions. Application limits/MFA remain mandatory regardless of WAF availability. Avoid claiming free-tier protection or scanner grade without deployed evidence.

### 16.3 Logging, audits and alerts

App-role audit log is append-only, owner-readable only, with redacted structured permitted diffs and request IDs; do not log full old/new profile/session/contact documents by default. Audit admin login/failed streak/device signal/factor/role/deletion/export/number change and all material business mutations; event/outbox/audit writes belong to their relevant transaction where possible. External auth attempts may require separate verified provider events; never fabricate complete visibility into provider-internal activity.

Sentry/log ingestion scrubs authorization/cookies/passwords/API keys/JWTs/refresh tokens/opaque sessions, phone/email/address, personal message, upload URL/body, provider payloads containing PII and guest tokens, including nested fields/URLs. Avoid PII in exception messages/request paths. Alerts cover failed queues/backups, suspicious abuse, unusual spending/usage and availability; minimize recipient data, deduplicate unchanged issues and configure actual channels. Client click analytics is best effort and cannot serve as accounting truth.

### 16.4 Backups, retention and incidents

Backup both Postgres records/schema and Storage objects/metadata according to actual plan capabilities. Encrypt exports, restrict access, separate backup keys from ordinary app reads, define retention and monitor failures. Proposed launch targets RPO<=24h/RTO<=8h must be justified with actual measured staging recovery, not promised from a free plan’s marketing. Restore into isolated staging and verify objects/private access/ownership, schema/migration version, representative order history and audit/job reconciliation. Suppress notification/job replay during restore until reconciled to avoid spamming customers or duplicate external actions.

Proposed retention: orphan quarantine24h, drafts30d, source uploads90d after delivered/closed, idempotency cached-response TTL at least 24h with a bounded actor/operation/key tombstone or record-level uniqueness rule for stale retries; an expired key must require an explicit new submission rather than silently recreate a request; routine minimized logs proposed30d unless security/legal policy needs otherwise. Guest grants need short scoped lifetimes appropriate to use, admin sessions30min idle/8h absolute, file-download ticket5min if used. Final legal/business policy overrides proposal values through explicit migration/config review; do not shorten business record retention blindly. Resolve long-open requests and deletion jobs explicitly so retention does not depend on an order ever reaching delivered.

Runbooks: leaked key, provider secret rotation/deployment order, revoke sessions/grants, lost MFA/factor recovery, account compromise/role rollback, abusive signup/enquiry shutdown, maintenance mode, DB+blob restore, production rollback/forward fix, payment/webhook reconciliation when enabled, incident contact/communications. Publish /.well-known/security.txt with a real monitored contact and suitable expiry. A support account cannot bypass owner MFA merely by asking a chatbot. Record runbook test outcomes and recovery owners.

### 16.5 Privacy, public proof and legal review

Provide genuine privacy/terms/shipping-return policies, contact and purpose-specific disclosure before collecting personal data. Explain WhatsApp handoff and what text/files/phone/email the business stores. Store consent/policy version/time where appropriate and allow withdrawal/export/deletion with identity verification, retention exceptions and response workflow. The need for consent/legal basis varies by processing; do not use a single checkbox as a blanket compliance assertion.

Review India’s applicable DPDP framework, consumer, tax/GST and any cross-border processor requirements with qualified advice before production. Do not state compliance solely from this prompt/policy text. For child/recipient photos and baby/naming gifts, minimize collection and obtain required guardian/rights decisions rather than assume the buyer may publish everything. Review stock/product photography, customer chats/client logos and brand asset rights; owner supplies genuine redacted proof, never fabricated counters/reviews.

Account export returns only the requester’s data plus justified shared record fields, no other customer or internal admin notes. Export artifacts are private, short-lived, authorized per download and removed after policy TTL. Account deletion revokes sessions/grants, removes eligible files/records, handles shared retained orders/audit/backups lawfully and reports exact retained categories; do not imply instantaneous erasure from all backups/caches/third-party WhatsApp systems.

### 16.6 Evidence and release criteria

For each test/control record ID, expected behavior, environment/revision, command or reproducible manual steps, redacted actual output/artifact, outcome and unresolved limitation. Outcomes: PASS, FAIL, BLOCKED, NOT APPLICABLE. A planned test is not PASS; a future unbuilt feature is NOT APPLICABLE with its future phase, not a current insecure endpoint exception. A critical external integration unavailable in staging means BLOCKED, not “works in theory.”

Mandatory release gate for implemented features:

- Clean secret scan of working tree and available full history; no exposed/default credentials.
- All application tables have RLS and deliberate grants; negative direct Data API/RPC/storage tests as anon/A/B/admin before/after MFA/editor; forbidden direct writes cannot bypass BFF controls. Public projections contain no private columns.
- Server-only functions validate actor/session/ownership/role/state; no service-role operation falsely counted as an RLS-policy test.
- Private buckets/quarantine proven private; public copies deliberately published; media proxy/grant/cache behavior tested; disguised/oversize/pixel-bomb/expired/cross-owner uploads fail.
- Distributed limits/challenge expiry/replay/hostname/action, outage behavior, CSRF/CORS, generic auth responses, ID tampering, session refresh concurrency, admin idle/step-up/logout/revocation and recovery tested on owned staging targets.
- Idempotent enquiry/code/concurrent status/quote/moderation/order conversion/outbox tests pass; deleted products preserve order history; zero-star reviews average correctly.
- Security headers/CSP/TLS verified in deployed environment; securityheaders.com A and SSL Labs A are target supporting checks where services can test the host. Explain service availability/provider-managed limitations rather than fabricate results.
- Dependency/Semgrep high/critical issues resolved, authorized OWASP ZAP baseline reviewed and manual XSS/SSRF/redirect/IDOR/file/replay tests completed. Scanner findings reviewed, not blindly suppressed.
- Critical functional Playwright flows pass; actual device/browser/accessibility/performance matrix results recorded with missing-device blockers visible. No real customer/provider endpoint is hammered by abuse tests.
- Backups include DB and blobs; measured restore/key/session/MFA incident drills complete; job replay/cost alerts/private-media cleanup work.
- Real number/domain/contact/policies/catalogue/consent/retention/owner business decisions and required legal review completed; owner can operate admin on phone; no demo trust claims in production.

External scores, automated tests and a well-written prompt reduce particular risks; they do not prove absence of defects or replace ongoing patching/monitoring. Fix implemented-feature security failures before expanding dependencies or launch. When a check cannot run, name what blocks it and finish independent authorized work.


## 17. Integrated phase-by-phase implementation plan

All phases use Sections 1–16 as the shared authoritative contract. Do not reset architecture or re-prompt the owner between phases. Before starting a phase, verify the prior phase’s actual evidence and feature/migration state; fix relevant regressions first. Progress through authorized independent work when external checks are blocked, but do not declare the dependent phase complete or launch with hidden failures.

Each phase must produce implementation, migration/seed updates when needed, README/env/architecture/ERD/decision/requirements-ledger updates, a working reviewable local or staging preview, functional and security evidence, and a short change/test/limitation note. The builder may create internal project documentation; the owner does not need multiple phase prompts.

A common milestone review applies after every phase: audit every implemented feature against Sections 3,5,6,9–16, including old behavior changed incidentally. Attempt forbidden reads/writes/role/session/grant operations directly, validate real server/storage behavior and rerun affected functional flows. Fix failures and record actual PASS/FAIL/BLOCKED/NOT APPLICABLE evidence before declaring that milestone complete. This is an internal review step, not a request to claim a separate independent security certification.


### 17.1. Phase 1 — Core framework — highest priority

#### Existing state and prerequisite checks

No application is assumed. Inspect the target workspace and instructions; do not overwrite unrelated existing work. Start a dedicated Memocious project if necessary.

#### Scope boundaries

Do not implement payments, custom-builder UI, review publishing, order-tracking portal, analytics or automatic messages in this phase. Reserve protected schema/contracts without weakening RLS.

#### Implementation tasks

1. Scaffold repo, lint/format/typecheck/build, .env.example, .gitignore, pinned dependency lockfile and CI secret/dependency checks. Write architecture decisions and migration workflow; verify current Supabase SDK, SSR/session/MFA and storage docs. Use local/staging secrets supplied through host secrets only.
2. Build responsive design tokens/layout, sticky navbar/search shell/footer/floating WhatsApp and Button/Input/Card/ProductCard/Skeleton/Modal/Drawer/Toast; real focus/keyboard behavior. Baseline about/policy/contact information must be truthful, consent present before any personal data collection. Optional unbuilt feature links are hidden or clearly unavailable.
3. Create versioned migrations, grants, indexes, constraints and RLS for profiles/admin_users/categories/occasions/products/product_images/junctions/product_options/orders/items/events/site_settings/audit_log, counter/idempotency/consent tables. Create the complete Section 9 application table contracts, including later review/wishlist/address/custom-request/enterprise/upload/draft/proof tables, deny-by-default now; extend via later migrations as features need it. Every created application table has RLS immediately. No future endpoint may be publicly writable merely because a schema exists.
4. Seed all editable categories: Gift Hampers>Festive Hampers; Bouquets>Flower/Chocolate/Cosmetic/Pipe-Cleaner/Teddy Bouquets; Resin Articles; Keychains; Photo Frames; Name Plates; Varmala Preservation Plates; Puja Thalis; Navkar Mantra Frames; Bookmarks; Jewellery; Pipe-Cleaner Articles; Flowers>Mini Flower Pots; Lamps; Curtain Holders; Combos; Corporate/Bulk Items. Seed occasion order Birthday, Anniversary & Couples, Wedding/custom packaging, Friendship, Graduation & Farewell, Baby Shower Return Gifts, Naming Ceremony Gifts, Return Gifts, Just Because, Festive Gifting>Rakhi/Diwali/Dussehra/New Year/Christmas, Corporate. Add 10 labelled staging sample products with legitimate test media; no fake production trust evidence.
5. Public Google/magic-link login, signup profile trigger, server guards, verified-email/expiry/denial/retry/safe-return flows, logout/everywhere and basic profile. Browse anonymously by default. REQUIRE_LOGIN_BEFORE_BROWSING is an editable flag default false; explain SEO effect and enforce server-side if enabled. Admin bootstrap is separately operator-controlled.
6. Routes / canonical /home alias, /shop, /shop/occasion/[slug], /shop/category/[slug], /product/[slug], /login and auth callbacks. Home shell reserves final order: navbar; hero; Enterprise then Loved Ones path cards; occasion strip; genuine proof; collection rows; how-it-works; testimonials; footer. Do not fill future trust sections with fake numbers.
7. Server-query catalogue with active-parent checks, URL-backed category/min-max price/4+ rating/customizable/colour/stock/lead-type/combo filters and counts; sort relevance/featured/price asc-desc/new/top-rated/best-selling, real evidence or honest unavailable state. Stable pagination 24/cap48, 2/3/4 grid, image/name/from-price/rating/badge; accessible empty/loading/errors. Bounded Postgres full-text search/suggestions. Product gallery swipe/zoom/thumbnails, price/range, materials/dimensions, lead time, descriptions and typed customization limits; related gifts/occasions. Baseline metadata/canonical tags and responsive optimized images now.
8. Core product WhatsApp flow: anonymous or authenticated enquiry, strict options/quantity/message/budget/pincode validation; calculate estimate server-side, snapshot item, atomic GFT code/counter/idempotency/enquiry+initial event. Return genuine continuation anchor/copy fallback. Include name/canonical link/options/personal message/budget/quantity/occasion/pincode/code in encoded bounded message, read settings number, never hard-code. Missing number disables handoff honestly. User must press Send; no automatic conversion/status claim.
9. Admin v1 separate origin preferred or unlinked random secret path; owner email/password+TOTP and verified recovery procedure, BFF session registry and server-only SQL role/assurance/session checks/idle/step-up/audit. Products add/edit/duplicate/hide/soft-delete/permanent-delete/bulk/delete-all with count-aware confirmation and retained historical records; safe product media upload/reorder/alt text; taxonomy add/rename/reorder/hide; price/options/SEO/customization fields; typed brand/contact/WhatsApp settings. Admin must work on a phone. No credentials in public artifacts or role escalation via profile changes.
10. Implement production-minded headers, distributed rate limits/Turnstile, Zod/CSRF/error handling, upload quarantine/validation and app-role append-only audit as needed for current flows. Minimal consent/retention/backups/runbooks before real data. Test data is isolated from production.
11. Create the final application schema contracts from Section 9 now, including private session/role registry and explicit safe publication projections. Later features may remain disabled, but their created tables get RLS and no unintended grants. Add server-only mutation entry points for current features only; do not create broad future CRUD endpoints. Demonstrate that raw anon/authenticated/admin provider tokens cannot mutate business state or bypass BFF limits; demonstrate legitimate owner BFF actions succeed through checked SQL functions.
12. Implement the actual managed-provider OAuth/magic-link/TOTP exchange, opaque-session store/refresh synchronization, owner bootstrap and exact cookie/cache behavior. Local placeholders can support UI development but cannot satisfy integration/security DoD. Public responses must not contain Set-Cookie or session-dependent data. Use private product staging before explicit sanitized public media publication.

#### Definition of Done

- Owner aal2 can create a product/media, assign multiple taxonomy entries, edit/hide/delete/bulk/delete-all safely; non-admin/aal1 calls fail at the BFF guard and server-only database transaction assertions; direct unprivileged DML remains denied for all browser tokens.
- Anonymous visitor can browse/filter/sort with share/back navigation, open detail and create exactly one enquiry under concurrent/repeated same-key submissions; WhatsApp continuation has correct number/encoding/code and copy fallback on real Android/iOS/desktop where available.
- Forbidden direct DB/RPC/storage tests pass for anon, user A/B and admin aal1/aal2; inactive parent children and private settings never leak. Order history survives product deletion.
- Typecheck/lint/build, appropriate unit/integration/e2e, scans and documented Lighthouse target measurements pass; device/provider-dependent checks are labelled blocked if unavailable.
- Staging preview, migrations/seed/README/env/decisions/ERD/architecture and evidence delivered. Phase 1 remains incomplete if external auth/MFA/RLS/grant/server-only-write integration is only mocked.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is guest write bypass, managed-provider/BFF cookie and refresh handling, SQL-only trusted actor assertions, public projections, product media publication, idempotent codes and delete-all history retention. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.2. Phase 2 — Trust, reviews and enterprise

#### Existing state and prerequisite checks

Phase 1 provides tested data-backed catalogue, anonymous enquiries, managed public auth, aal2 admin, protected media/settings, audit and CI. Verify these prerequisite tests before changing behavior.

#### Scope boundaries

Preserve Phase 1 routes, code/idempotency format, ownership, cookie/MFA and catalogue contracts. Do not add online payment, builder or tracking UI yet.

#### Implementation tasks

1. Complete home in exact order: navbar; controlled product hero carousel; Enterprise/Bulk then Loved Ones cards; horizontally scrollable occasion bar; owner-supplied redacted consented sales-proof/gallery/caption/name/city and editable genuine counters; featured/bestsellers/new; Choose/Personalise/Chat/Receive; approved-review testimonials; footer/contact/policies/social. Hide unsupplied proof/counters; pause/reduced-motion behavior. Finish about/contact/FAQ with working protected contact form.
2. Activate reviews and review_reports migrations with unique user/product and 0–5 inclusive CHECK; null/no-selection means UI unrated; zero is a valid intentional review. Verified signed-in user submits pending text/stars/optional image; own pending/rejected reads; approved public list/distribution/date/first name, average/count derived only from current approved nondeleted rows. Edit resets pending, delete removes from aggregates, report queues admin action. Server-only mutation functions and DB assertions prevent self-approval/identity reassignment; public projections hide private authorship/moderation columns. One existing row per account/product even after soft delete. Owner moderation approve/reject/delete and reports; no fabricated verified-purchase badge.
3. Add auth-required wishlist toggle with unique constraint/ownership and account wishlist/My Reviews; saved addresses with user ownership and safe validation; profile/data export/delete baseline with legal retention handling. No PII browser persistence or public caching.
4. Enterprise landing for pens/shirts/mugs/hampers/trophies/welcome kits, genuine client/event photos, product-configured MOQ/lead-time/steps/FAQ, downloadable owner-managed sanitized static PDF. Bulk form includes organization/type/contact person/role/phone/email/optional GSTIN, multi-item/qty, logo/colours/text, deadline/city/pincode/budget/notes/consent. Login for private logo upload; guest no-upload enquiry allowed. Validate MOQ/date/options, issue atomic idempotent ENT code, New/Contacted/Quote sent/Negotiation/Won/Lost records, dashboard badge and retry-safe optional email; explicit WhatsApp continuation.
5. Admin sales-proof/counter manager, review/report queue, inquiry pipeline/notes/quote and authorized private uploads. Snapshot consent/policy versions and expire orphan files. Approved review-photo publishing copies sanitized media to public only after approval; rejection/removal unpublishes and invalidates caches.
6. Implement explicit zero-star selection and null unrated state. Add tests for all-zero approved averages, mixed ratings, moderation/concurrent edits, soft-delete restore and incompatible rich-result markup exclusion. Ensure public review projections do not leak UUIDs/email/moderation data even through direct base-table reads. Contact form and quote-notification email use outbox/dedup/rate protections, never arbitrary recipient/template injection.

#### Definition of Done

- Genuine proof can be managed without fabricated defaults; home order, carousel accessibility and empty states verified on mobile/desktop.
- User A cannot review twice, self-approve, edit B’s review/report/address/wishlist, publish a private original, or retain approval after editing. Rating aggregates change correctly under moderation/delete/concurrency.
- Enterprise submission records one ENT enquiry, validates quantities/deadlines, shows manual WhatsApp continuation and dashboard notification; optional email status is truthful. Cross-user logo access and active-file upload fail.
- Previous Phase 1 critical flows plus review-once/moderation and enterprise flow tests pass; deliver preview/migrations/evidence/docs.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is 0–5 rating semantics, approved-review field projection, moderation races, customer photo publication/consent, inquiry spam and safe PDF publishing. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.3. Phase 3 — Custom gift builder

#### Existing state and prerequisite checks

Phases 1–2 provide catalogue/taxonomy/options, secure auth/admin/media, reviewed enquiry transactions, enterprise/reviews and private upload controls. Verify existing behavior and contracts first.

#### Scope boundaries

Preserve storefront/review/enterprise behavior and existing enquiry snapshots/codes/permissions. Do not add online payment or claim quotes are final prices.

#### Implementation tasks

1. Activate builder_drafts/custom_requests/request_uploads with RLS, ownership, versioning/schema version and expiry. Auth required for saved uploads/drafts/submission; let guests inspect nonpersistent choices and sign in to save. Never put contact/photo data in localStorage/sessionStorage.
2. Accessible /build-a-gift stepper: budget slider/presets under500/500–1000/1000–2000/2000+/custom; DB-backed hamper/bouquet flower-chocolate-cosmetic-teddy-pipe-cleaner/resin/keychain/frame/etc type; optional occasion/recipient/theme; 500-character message/preview; DB-backed colours/add-ons greeting card/chocolates/extra flowers/premium packaging/wrap with price hints; drag-drop/camera/upload preview/crop; review quantity/requested date/pincode/contact; submit quote. Save each step server-side, resume after login, stale-version conflicts, cancel/reset/delete, interrupted-network recovery and keyboard/error navigation.
3. Show a bounded estimated range only when supported by trusted option data; label subject to owner confirmation. Validate budgets/ranges/required customization/files/type compatibility/date/quantity at each step and entire final submission.
4. Exact-path authorized private upload tickets→quarantine→server content validation/re-encode/EXIF removal→ready; 5 files×5MiB/25MiB, decode bounds/HEIC verification/expiry/ownership. Cropping in browser is convenience, never final security validation. Delete abandoned drafts/orphans on schedule; no unauthorized object replacement or finalization.
5. Atomic, actor-idempotent CUS code/request/draft-submitted link, summary WhatsApp continuation/copy fallback; attachments stay private in admin, not falsely attached to wa.me. Admin request list/search/authorized uploads/notes/quote/status; conversion to an order references original request and preserves quotation history.
6. Use the file state machine and authenticated media proxy from Section 13. Reserve quotas atomically, reconcile storage/job failures, and test refresh/draft concurrency. A provider signed URL must not be claimed instantly revoked by expiry. No secret tokens or contacts/photos are persisted by service worker/browser storage.

#### Definition of Done

- Draft survives navigation/logout/login under its actual owner; concurrent tabs receive conflict recovery without overwriting unnoticed. All steps and error/resume flows work on phone/keyboard.
- One final submit produces exactly one CUS request under retries; estimate is server-calculated and explicitly provisional; owner can inspect uploaded sanitized private images and quote.
- User A/B/anon cannot read, sign, finalize, overwrite or delete another user’s draft/files; disguised/oversize/decompression/EXIF tests and expired-ticket/orphan-cleanup tests pass.
- Prior critical flows and builder-submit Playwright/integration tests pass; deliver preview/schema/docs/evidence and retention job result.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is draft/upload IDOR, exact-path ticket reuse, byte/pixel quota races, safe decoding/EXIF removal, partial-failure reconciliation and private media caching. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.4. Phase 4 — Order tracking and customer account completion

#### Existing state and prerequisite checks

Phases 1–3 provide authenticated/anonymous enquiries, stable GFT/CUS/ENT identifiers, item snapshots, immutable initial events, custom/enterprise quotes and admin MFA. Validate existing ownership and idempotency tests first.

#### Scope boundaries

Preserve enquiry creation and manual WhatsApp flow. Do not infer payments/fulfilment from chat clicks. No automatic WhatsApp/courier API or website payment integration.

#### Implementation tasks

1. Implement explicit state machine Inquiry→Confirmed→Payment received→In production/Being customised→Quality check→Packed→Shipped/Out for delivery→Delivered plus On hold/Cancelled/Refunded. Document allowed edges, resume state, reason/step-up requirements and concurrent version checks. Require agreed total before confirmation/payment state, qualified owner action and immutable event in the same transaction.
2. Admin list/search/status filters/detail, one-action status update with note/photo, internal versus customer-visible data, confirmed total, validated courier/name/number/HTTPS domain link/ETA. Publish only approved customer-visible processed photos. Custom/enterprise conversion creates or links an order idempotently without duplicate history.
3. /orders and /orders/[code] ownership-checked timeline: status/time/customer notes/photos/courier; protected no-store polling around30s, pause hidden tabs/backoff/offline indication. Direct Realtime is optional only after a documented BFF-compatible subscription/authorization design; no browser provider refresh tokens. Account completes My Enquiries/Orders, profile/addresses/wishlist/My Reviews, reauthenticated export and deletion with retention policy.
4. /track uses POST code+phone-last-four+Turnstile, randomized code suffix, uniform failure, strict distributed IP/code limits and constant-time comparison; returns coarse status/date only. Explain no-phone enquiries cannot use phone lookup. Rich guest views require a separate verified scoped guest session, established by a creation receipt or verified high-entropy single-record grant with expiry, hashed storage, revocation and no-referrer/log leakage. Use authenticated no-store private media delivery. Never let user claim an order with an unverified contact match.
5. Every status change offers Notify on WhatsApp anchor for customer number with code/minimal update and safe tracking link. Owner presses Send; optional Resend email queued idempotently with consent and retry status. Configurable status age thresholds/SLA dashboard for stuck orders; automated courier/WhatsApp remains Phase 8.
6. Apply the exact state/precondition table and separate payment facts in Section 14. Test hold/resume, failed quality check, ready-made skip, cancellation after paid, refund due versus actual refund, late webhook compatibility and concurrent guest claim. Phone-last-four cannot create a rich-data grant. Background polling does not extend administrative idle time.

#### Definition of Done

- Valid transitions generate exactly one event, invalid/replayed/stale concurrent transitions fail safely; internal notes never appear in customer timeline; product deletion leaves snapshots intact.
- Account A cannot view B’s order by code or direct API/event/photo access. Public lookup leaks no contact/note/image/courier details and resists distributed per-code/IP probing; tokens expire/revoke.
- Timeline updates without manual reload; notification links and optional email are correctly distinguished from actual delivery/payment/message confirmation.
- Privacy export/delete, guest claiming protections, transition tests and track/owned-timeline e2e pass alongside prior regression suite; deliver preview/docs/evidence.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is phone/code enumeration, guest grant/claim ownership, status/payment/refund correctness, internal notes isolation, notification retry and idle polling. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.5. Phase 5 — Admin maturity and analytics

#### Existing state and prerequisite checks

Phases 1–4 provide storefront, reviews, enterprise/builder, account tracking and a working owner-only MFA admin. Read existing role, audit, session and data-retention contracts before adding editor access.

#### Scope boundaries

Preserve all previous ownership/MFA/retention rules and historical snapshots. Do not count wa.me clicks as confirmed sales; do not introduce public admin links or third-party admin replay/analytics.

#### Implementation tasks

1. Dashboard: new orders/enquiries, this-week inquiries, stuck SLA states, top products from documented source, enquiry-created vs handoff-clicked vs admin-confirmed funnel with time windows/timezone/filter definitions. Counts should be deduplicated and based on real records; protect analytics endpoints as admin and aggregate PII.
2. Activate scoped owner/editor permissions with explicit matrix. Owner alone manages roles, destructive exports/settings such as WhatsApp number, permanent/bulk deletion and audit viewer. Editor gets only selected product/order/moderation actions. All staff require aal2; prohibit owner self-removal/last-owner lockout, log/re-auth role changes and invalidate revoked sessions. Multi-staff workflow is ready; granular vendor/staff accounts remain Phase 8.
3. CSV product import/export and authorized order export: size/row caps, strict schema/UTF-8, dry-run validation, row-level error report, upsert/duplicate rules, atomic batches, no remote URL fetching, formula-injection neutralization on export. Recent MFA and audit for personal-data exports; downloadable private short-lived assets. Do not bypass standard validation by importing.
4. Hero/banner/featured-product manager, genuine sales-proof/counters, seasonal swappable Diwali/Rakhi/Christmas tokens with contrast validation, add-ons/colour/filter configuration and validated WhatsApp/contact/policy/message templates. Public settings projection remains explicitly allow-listed and cache-invalidated. Dark theme stays optional tracked enhancement.
5. Owner audit viewer with redacted diffs, searchable bounded pagination; session/device list, revoke/logout-everywhere; security alerts and failed-attempt streaks. Backup/export tooling for DB and blobs, encrypted access controls, retention schedule and timed staging restore. Document operator break-glass recovery without weakening customer/admin authentication.
6. Validate the owner/editor matrix at both server guard and transaction-function levels. Do not grant authenticated direct DML simply to make staff UI work. Token/session grants/refresh credentials never appear in the owner audit/export UI. Cost/funnel metrics distinguish attempted handoff from actual manual confirmation and do not claim precise message conversion attribution.

#### Definition of Done

- Editor fails owner-only role/export/number/delete/audit actions even by direct RPC; role revocation and idle/recent MFA limits are enforced, last owner cannot lock themselves out.
- CSV dry-run/import/export handles malformed rows, formula content, duplicate IDs, oversized input and rollback; immutable historical orders remain intact.
- Metrics reconcile to seeded known events and label handoffs accurately; published seasonal themes meet contrast/accessibility.
- Backups restore both records and blobs within recorded targets; session/audit/security alert tests pass with prior critical flows; deliver preview/docs/evidence.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is editor privilege escalation, owner lockout, CSV import/export/formula injection, unsafe templates/theme values, personal exports and restored private blobs. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.6. Phase 6 — SEO, performance, PWA and languages

#### Existing state and prerequisite checks

Phases 1–5 are expected to provide implemented commerce-enquiry/account/admin flows with recorded verification, baseline metadata and consent/privacy controls. Record baseline performance/cache behavior before optimization.

#### Scope boundaries

Preserve protected-data no-store policies, BFF/session/MFA architecture, server-side pagination and all security gates. Never cache private records or tokens in a service worker; no fabricated structured-data reviews/offers.

#### Implementation tasks

1. Public metadata/canonical/OG images, robots and sitemap containing only indexable active public routes/products/taxonomy. Exclude login/account/orders/track/admin and sensitive query strings; canonicalize filter/search duplicates intentionally. Product/aggregate-rating/breadcrumb JSON-LD from real current approved data; escape serialization and show truthful from/estimated pricing. Never advertise private admin path in robots.
2. Tune ISR/CDN revalidation on product/taxonomy/review/settings edits, responsive image CDN/WebP/AVIF, fonts, bundle splitting and query indexes/EXPLAIN on realistic 10k fixture. Verify cache keys/public projections and cross-user no-leak tests, avoid N+1 and all-products fetch. Record mobile Lighthouse >=90 categories, LCP<2.5s under stated Android/4G test conditions, layout-shift/bundle metrics, before/after results and tradeoffs.
3. Installable PWA manifest/icons/theme-colour, accessible offline fallback and controlled update flow. Cache only versioned public static assets/explicit safe public pages; exclude APIs/auth/admin/track/account/private signed media and clear relevant caches on logout. Never present an offline saved enquiry as actually submitted; reconnect requires server acknowledgement/idempotency.
4. Add consent-aware optional Plausible/Umami/GA4 with no contact/message/photo/token content, reject/withdraw support and no admin tracking. Business/Instagram link-outs use genuine owner URLs. Optional Hindi/Marathi with complete translation catalogues, locale routing/canonical/hreflang, INR/date formats and lazy Noto Sans Devanagari. Never machine-fabricate policy approval; untranslated sensitive text falls back visibly to English. English remains default until owner enables languages.
5. Audit public ISR/session refresh and CSP strategy together; test Set-Cookie cache isolation and prevent private files from public image optimization. Review zero-star structured-data eligibility without changing actual ratings. Service worker default is safe-static allow-list, with no customer draft/contact/photo/offline submission queue.

#### Definition of Done

- Crawl/sitemap/structured-data validation exposes only truthful public content; hidden/inactive products and private/admin paths absent. No PII in OG/canonical/JSON-LD/analytics.
- Performance budgets are measured/reported, real query plan/scale evidence included, edit revalidation verified. Private cached-session cross-user tests pass.
- PWA installs/offline fallback works; service-worker/cache inspection proves no private tokens/data/media, and offline submit cannot fake success.
- Consent accept/reject/withdraw and optional locale switching work accessibly; prior flows/regressions plus documented Lighthouse/SEO artifacts pass.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is cross-user ISR/CDN/service-worker/image-cache leaks, auth callback cookies, JSON-LD injection, zero-rating markup truthfulness, consent and locale redirect safety. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.7. Phase 7 — Hardening, QA and launch

#### Existing state and prerequisite checks

Phases 1–6 are implemented with staging evidence and documented external blockers. Owner business defaults, real contacts/media, pricing/MOQs and policies must be finalized for production.

#### Scope boundaries

No feature expansion or disabled security to force scans green. Preserve prior APIs/permissions/data. Do not call launch complete while mandatory checks/setup/legal approval remain unverified.

#### Implementation tasks

1. Re-audit every shipped feature end-to-end and fix failures. Secret scans tree/full history; no public secrets/default credentials/debug/source maps; npm audit/Semgrep high-critical resolution; authorized staging ZAP baseline and reviewed alerts; all tables/grants/functions/views/storage policy audit and anon/A/B/admin aal1/aal2/editor negative tests.
2. Actual rate-limit/Turnstile hostname/action/expiry/replay tests, idempotency/concurrency/failure recovery, admin MFA/recovery/idle/step-up/revocation, CSRF/CORS/SSRF/open redirects, ID tampering/direct RPC/storage, disguised/oversize/decompression uploads, stored script injection, generic auth/enumeration and public-track brute-force tests. Bound testing to owned staging targets; no uncontrolled production abuse.
3. Accessibility keyboard/screen reader/contrast/motion and layout tests plus real iPhone Safari, Android Chrome, Samsung Internet, macOS Safari, Windows Chrome/Edge and Firefox. Record versions/devices/results; use Playwright coverage additionally, not as a false substitute for unavailable devices. Critical flows browse→product→WhatsApp, admin add/delete/bulk, review-once/moderation, builder/enterprise submit, tracking/export/delete; concurrent load fixture 10k products and agreed staging traffic target, with latency/error/cost report.
4. Final legal/privacy/shipping/returns/terms/content/consent/retention review; genuine media/client-logo rights and redaction, appropriate DPDP/consumer/tax handling reviewed by qualified owner/legal advisor. Configure real WhatsApp/domain/email/security contact and policies, remove demo products/trust data, confirm all unresolved business choices. Do not invent approval.
5. Production hosting commercial eligibility/plan/quotas, DNS/Cloudflare supported WAF/bot/access/rate controls/origin bypass mitigation, HTTPS redirect/TLS, staged HSTS/CSP/all headers; external securityheaders.com A and SSL Labs A tests with reports where available. Verify OAuth callbacks/Turnstile production domains, no public private-data caches, production monitoring/usage alerts/outbox/cleanup.
6. Backup DB+blobs, restore rehearsal with timed RPO/RTO, key-rotation/session-revoke/lost-MFA/maintenance/rollback/incident runbooks, security.txt, operational owner training on phone for products/orders/reviews/quotes/delete/export/leaked keys. Soft launch with limited genuine orders, recorded rollback criteria and postlaunch checks. Production deployment is an explicit final release step only after concrete verified build and mandatory gates; if release authorization is required by the execution context, present the ready artifact and gate evidence first.
7. Use the complete release checklist in Section 16.6. Verify current provider limits, legal/owner decisions and recovery behavior in the actual deployed configuration. Separate actual passing checks, unavailable third-party scanners/devices and unsupported experimental MFA recovery. A general “all tests pass” line is insufficient without underlying evidence. Do not assert the system contains no vulnerabilities.

#### Definition of Done

- All implemented-feature security controls PASS with redacted reproducible evidence; unresolved external/device/legal/release items are explicit BLOCKED, not hidden in “done”.
- Cross-browser/accessibility/load/performance/critical e2e evidence accepted; backup+blob restore and security recovery drills actually completed.
- Real business data/number/policies/providers configured and verified, owner trained, deployment/rollback/monitoring runbooks usable.
- Production URL and exact deployed revision plus soft-launch outcome delivered only after successful deployment; otherwise deliver staging URL and exact release blocker without claiming launch.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is the entire shipped application and actual provider configuration, complete security evidence/real-device matrix, DB+blob restore, incident recovery and final release blockers. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


### 17.8. Phase 8 — Scale roadmap — integration-by-integration

#### Existing state and prerequisite checks

Phases 1–7 provide a verified launched WhatsApp-enquiry business with manual payment/fulfilment, secure schema adapters, scoped admin roles and operational runbooks. This prompt is a roadmap; select and configure one integration before implementing it.

#### Scope boundaries

Do not activate all roadmap features by default, silently migrate payment facts, remove the working manual WhatsApp path or treat browser redirects as payment proof. No provider secrets or fabricated live credentials.

#### Implementation tasks

1. Inventory the requested next integration, cost/owner/provider prerequisites and rollback plan; leave all other roadmap items explicitly deferred in the ledger. Preserve existing storefront/enquiry/order IDs/events/consent/private media while adding versioned tables/adapters/RLS. Verify current provider docs and sandbox access before coding.
2. Razorpay/online UPI, invoices and GST: server-create amount/currency/order from trusted quote, signed replay-safe webhooks, unique provider event IDs and idempotent processing, webhook reconciliation/timeout/retry, captured-versus-authorized distinction, partial/full refunds, append-only payment events and double-fulfilment protection. Never store card secrets/data. Payment success requires verified provider state, never client callback alone. Legal/tax invoice numbering/details/retention verified.
3. WhatsApp Business Cloud API: registered business, approved templates/opt-in, protected provider tokens, signature-verified idempotent webhooks, queue/retry/backoff/rate limits, delivery/failure states, unsubscribe/preference handling and bounded costs. Keep manual links while APIs are unconfigured. Implement automatic updates/admin security alerts only with authorized templates and configuration.
4. Courier Shiprocket/Delhivery adapters: server credentials, serviceability/quote confirmation, controlled label/PII handling, verified webhook/polling reconciliation, normalized shipment statuses, no blind rollback of delivered/refunded states, safe tracking links and failure fallback.
5. Inventory/reservations/stock alerts with concurrency-safe release/expiry/oversell prevention; coupon/referral/loyalty rules validated server-side, atomic caps and anti-abuse, cancellation/refund reversals. Abandoned-draft reminders and marketing automation need explicit channel consent/retention/unsubscribe and no personal content leaks.
6. Further multi-admin permissions, vendor/staff scoped accounts, multi-city and multi-brand support, with tenant/brand/city isolation in tables/RLS/storage/cache keys, recommendations using approved minimal data and explainable fallbacks. Do not give a vendor owner-level rights or cross-brand access. Evaluate schema migration/backfill, volume/cost/load/observability, backup and rollback for each rollout.
7. Preserve the shared server-only write architecture. Verify webhook signatures over the required raw request bytes with the correct provider/version algorithm, timestamp/freshness if supported, unique event IDs and controlled key rotation. Return provider acknowledgements only after durable event persistence; process asynchronously idempotently. Reconcile uncertain payment captures before issuing refund/fulfilment actions. Never promise exactly-once network delivery. All roadmap items remain listed with status even when only one integration is selected.

#### Definition of Done

- One explicitly selected integration works in sandbox and its migrations/RLS/secret handling/webhook signatures/replays/idempotency/concurrency/failure recovery are tested; unsupported integrations remain visibly deferred.
- Manual enquiry/WhatsApp ordering and existing orders remain functional. Payment/shipment/message states reflect verified provider evidence; reversals/reconciliation and rollback are tested.
- Privacy/consent/cost/role/tenant isolation checks pass for every enabled feature; no live activation before actual provider/business setup and required release authorization.
- Deliver integration-specific preview/tests/docs/runbooks and full-regression evidence. Do not describe the entire roadmap as built after implementing one item.

#### Mandatory phase security review

Run the common milestone review against all implemented features. This phase’s additional focus is webhook forgery/replay/order-price tampering, reconciliation/refund/fulfilment races, cost/consent, stock/coupon concurrency and vendor/tenant isolation. Supply redacted actual evidence, fix current-feature failures, rerun affected checks and record precise remaining external blockers. Do not weaken shared rules or claim unexecuted checks passed.


## 18. Acceptance scenarios that must drive implementation

Use meaningful tests of observable invariants and actual database/storage behavior. Avoid writing dozens of tests that merely repeat implementation details. The following scenarios are the minimum critical coverage, applied as features become available:

1. **Public browsing:** no login needed; catalogue and occasion/category pages show only published active products. URL filters/sort/page survive share/back/forward; parent descendant semantics/dedup/counts and empty/reset states match server results. No full catalogue downloaded to browser.
2. **Public payload privacy:** approved review/setting/media metadata reads expose only designated fields; attempts to read base authorship/session/admin/contact columns fail. Hidden draft product metadata/media cannot be discovered through public API/storage. Previously published media is explicitly recognized as public, not claimed secret again by hiding its product.
3. **Authenticity:** no supplied sales proof means no fake numbers/reviews/client logos. Zero ratings are actual zeros; review_count=0 is unrated/null. Policies/contact/MOQ/lead-time claims are not fabricated.
4. **Enquiry idempotency:** double click/concurrent retries/same key create one record and correct code/items/event. Different semantic payload with same key conflicts. Failed transaction creates no orphan inquiry; sequence gaps are acceptable. Replay cannot obtain another actor’s result.
5. **Pricing/options:** negative qty, invalid option ID, stale inactive product, excessive text, price tampering/zero-vs-absent price and malformed money are rejected server-side; price changes require review where appropriate. Historical order snapshots survive product deletion and later price/label edits.
6. **WhatsApp:** Android/iOS/desktop continuation URL contains actual configured number, correctly encoded options/message/code and canonical product link. User must press Send; fallback copy/manual number works. Popup blocked/WhatsApp unavailable does not erase enquiry or fake sent status. No private-file/token URLs in message/logs.
7. **Missing providers:** absent live number/domain/email/auth/database config gives truthful disabled/blocked states, not fabricated success or demo orders in production. Independent local/staging work can continue.
8. **Managed identity/BFF:** PKCE/state/callback return validation; denied/expired link; verified identity; no browser provider tokens; session-fixation rotation; concurrent refresh; cookie flags; Set-Cookie never in shared cache; revoked/missing/wrong-audience app session fails.
9. **Admin:** operator bootstrap only; primary login without verified MFA cannot read/mutate business data. Idle/absolute/recent-factor rules hold under background polling and clock boundaries. Known secret path does not bypass auth. Role changes revoke applicable rights; editor cannot act as owner; last owner protected; recovery tested or clearly blocked.
10. **Direct bypass:** anon, customer A/B and owner/editor provider tokens cannot execute business mutation RPCs or direct table DML. Authorized BFF operations succeed and audit correctly; forged actor/user/role/session fields are rejected/ignored safely. Privileged-key compromise is documented as outside RLS protection, never “tested away.”
11. **Review:** duplicate row fails DB constraint; zero deliberate/none missing distinction; edit resets approval; own pending/rejected visible only privately; own delete/restore reuses row; photo requires sanitized approved public copy; aggregates correct under concurrent moderation. Stored script text renders inert.
12. **Upload:** invalid MIME/extension/polyglot/large byte count/too many files/oversized dimensions/frame bomb/expired ticket/cross-user parent/overwrite rejected; EXIF/GPS absent from ready output; quarantine never published; quota reservations survive concurrent/failed uploads and release after expiry. HEIC unsupported environment yields truthful conversion state.
13. **Private media/grants:** A cannot obtain/view B’s normalized photo/file by object ID, storage URL, signature endpoint or image optimizer. Private proxy uses live authorization/no-store; expired/revoked/wrong-record guest grants fail. Signed provider CDN behavior is tested before any claim about expiry. Browser-downloaded copies are not claimed revocable.
14. **Builder:** resume owned draft across devices, stale-version conflict, partial upload/save interruption, type-change cleanup, final server validation, estimate label and one CUS on retries. Browser storage does not retain PII/photos/tokens. No fake success offline.
15. **Enterprise:** all documented fields/MOQ/date validations, no-upload guest flow, login-on-logo, one ENT on retry, genuine dashboard status/outbox behavior, safe PDF and manual continuation. Won status requires real agreement, not click.
16. **Tracking:** guessed code/wrong last-four generic response with no rich fields; per-IP/code protection does not create indefinite attacker lockout. Phone-less enquiries have explicit limitation. Rich guest grant applies to one record only; account claim requires verified possession and concurrent claim conflicts. Internal notes never leak.
17. **State/notifications:** permitted transitions and hold/resume, failed quality check, already-paid cancellation/refund_due, ready-made skip and version conflict; one event/outbox per mutation/replay; private/customer notes separated; manual WhatsApp and optional email not falsely equated to delivery. Restore/job retry cannot duplicate notifications unboundedly.
18. **CSV/settings:** formula-prefixed exports neutralized as plain data, malformed/oversized imports fail dry-run, duplicate/update rules deterministic, no remote fetches or validation bypass. Theme contrast/template destination/policy/number changes safe and audited; owner-only export/step-up.
19. **Caching/PWA/SEO:** no session/admin/track/media-grant leakage in CDN/service worker/ISR; logout invalidation boundaries clear. Accurate public structured data only, zero-rating eligibility handled honestly, no hidden admin sitemap/robots path, no fake offline order completion.
20. **Operations:** actual scanner/manual attack outputs, real-device limitations, monitored cost/cleanup/outbox failures, full DB+blob restore, token/key/MFA recovery and privacy export/delete/retention flows. Third-party unavailable tests remain blocked with a specific reason.
21. **Phase 8, if selected:** wrong signature/raw-body mutation/replay/out-of-order duplicate event/amount mismatch/timeout/partially completed refund/stock race all fail or reconcile safely. Tenant/vendor cannot access other organization/brand data. Do not activate live integration from a client redirect or sandbox result alone.

For test actors, create synthetic isolated fixtures and tear down safely. Record the difference between route rejection, database grant/RLS rejection, transaction assertion rejection and storage denial. Each is separate evidence, not interchangeable. Never print credentials/token values/customer data in test output. Bounded load/abuse tests run only on authorized owned staging infrastructure, with email/payment/courier sends stubbed or sandboxed as appropriate.


## 19. Project deliverables, progress reporting and final handoff

Maintain implementation artifacts in the repository:

- README with local setup, exact supported runtime/version commands, provider prerequisites and owner/admin operating guide.
- Sanitized .env.example; feature/config schema and startup validation; separate development/staging/production deployment guidance.
- Versioned migrations/rollback notes, deterministic nonproduction taxonomy/demo seed and generated schema types.
- Architecture/data-flow diagram and ERD matching the implemented BFF/session/server-only-write/public-projection/private-media design, not an aspirational obsolete design.
- docs/decisions.md for owner defaults, verified current provider capabilities/prices/constraints, selected exceptions, optional/deferred features and changes to invariants.
- Requirements ledger mapping every section/phase to implementation status, acceptance scenario, revision/evidence, blocker/owner and resolution. Keep original 0–5 review/occasion/admin/deletion/WhatsApp requirements intact unless owner changes them explicitly.
- Functional/security test fixtures/scripts and reproducible redacted results. Critical Playwright paths: browse→product→enquiry→WhatsApp anchor; admin create/media/edit/hide/delete/bulk; review-once/moderation; enterprise submit; builder submit/resume; private tracking/guest limitations; account export/delete. No claim that Playwright covers real-device physical behavior fully.
- Upload/outbox/retention/backup jobs, dashboards/alert setup and tested incident/key/session/MFA/restore/rollback runbooks.
- A working local preview at minimum and staging deployment URL when real configured hosting access exists. Report exact deployed revision; production URL only after verified successful release. Missing infrastructure/auth/devices/legal approval remains explicitly named.

Before each progress report, verify what actually changed and what actually ran. State the outcome first, what remains uncertain and which next action will resolve it. Do not repeatedly ask the owner to approve routine reversible implementation decisions already covered by this document. Do not imply a tool/provider/secret is connected merely because its package was installed.

At phase completion, provide a concise demo checklist, implemented scope, measured verification, unresolved blockers and current next step. Continue the next authorized milestone when prerequisites allow. If an implemented security-critical check fails, fix it and rerun affected checks rather than making an unsupported declaration of readiness. Independent unaffected work can proceed while external dependencies remain blocked.

Final handoff must distinguish implemented/verified, implemented-but-unverified, intentionally optional/deferred and blocked. Teach the owner how to add/reorder/hide/delete products from phone, configure real WhatsApp number safely, manage quotes/orders/reviews/uploads, handle a leaked key/lost MFA device and recover from mistakes. Explain exactly which features still require owner/provider/legal setup. Keep product UI simple; expose technical details in owner/developer documentation only when they help a meaningful decision.

## 20. Final builder instruction

Implement this one integrated specification incrementally, with **Phase 1 as the highest priority**. Preserve the normalized catalogue, full home order, anonymous WhatsApp enquiry model, 0–5 moderated reviews, enterprise workflow, resumable private builder, manual tracking loop, full admin control including safe delete-any/all, and the complete later roadmap.

Before writing code, turn the shared invariants into a short dependency-aware implementation checklist and inspect the actual repository state. Then do the work. Before claiming a milestone complete, critically review your own implementation for contradictions, direct bypasses, missing requirements, unverified assumptions and regressions; fix them and show evidence. A later code change must rerun the affected earlier checks.

Do not say “secure,” “production-ready,” “compliant,” “all tests passed,” “instant revocation,” “message sent,” “payment received,” or “fully supported” unless the specific claim is justified by actual implementation behavior and recorded evidence. Prefer precise statements about verified controls and remaining limits. Do not invent proof or promise a fallacy-free or vulnerability-free system.
