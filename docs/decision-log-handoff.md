# Memocious — consolidated decision log
Updated 27 October 2026. Handoff to local Codex CLI.

This file records decisions from the project documents and this conversation. It supersedes stale status claims in the 21 October docs/decisions.md, README, checkpoint and operations guide. The original specification remains the feature authority. Evidence reports record tests; they are not blanket security or release certification.

## User decisions and working arrangements
- Continue implementation on the user's PC using Codex CLI and the latest GitHub repository, harshrhandore/Memocious-. Older delivery ZIPs are not the latest source.
- Preserve existing local changes. Keep dependencies, build output, backups and secrets outside Git commits and shared archives.
- Continue Phase 2 while explicitly tracking remaining Phase 1 checks. Do not call Phase 1 fully complete or claim production readiness.
- Defer database AND uploaded-file backup/restore rehearsal until before production release. Do not let that deferral block Phase 2.
- Defer Studio appearance/usability redesign to Phase 5, advanced administration. Improve hierarchy, product management, responsive layout and confusing setup wording then. Functional defects remain fixable immediately.
- Remaining manual checks to record explicitly: successful password reset followed by new-password success and old-password denial; physical-phone navigation and WhatsApp handoff.
- Owner confirmed the backup authenticator works. Do not ask them to repeat initial owner/MFA setup without a new diagnosed reason.
- Never request passwords, recovery links or TOTP secrets in chat. Configure runtime secrets through secret settings.

## Architecture and dependencies
- Next.js App Router, React, TypeScript, Tailwind, Supabase, jose and Sharp; use the committed package.json/package-lock.json as exact version authority. Node 24 is required.
- Dedicated Supabase project bpvtdehesnlgwccmrlhz, Mumbai. Preserve it and its migration history; no routine database recreation.
- Private application tables use RLS and no direct anon/authenticated table grants. Public catalogue is an explicit safe projection. No role authorization from editable user_metadata.
- Local stub/fixture tests supplement actual hosted provider tests; they do not replace them.
- Preserve optimistic product versions, typed mutation boundaries, bounded pagination, advisory catalogue locks and exact count/version-bound bulk confirmation.
- Keep saved enquiry snapshots and audit history through product deletion.
- Ten labelled sample drafts are examples, not real stock or proof of sales. Never fabricate reviews, ratings, sales or availability.

## Hosting and migration
- User chose Netlify. Original Caffeine Coders account ran out of deployment credits.
- Replacement account/team: Starlit-Studios, slug harsh-handore.
- Current staging project: memocious-staging-v2, site ID 63c20b0d-aeca-44cf-be23-1d5e8a57b055.
- Current origin: https://memocious-staging-v2.netlify.app.
- GitHub main is connected to automatic Netlify deployment. Explain deployment effects before pushing from local CLI.
- Use Next's current Netlify adapter, npm run build and .next output. Removed legacy rewrites to nonexistent ___netlify-handler; do not reintroduce them.
- Secret-variable writes using all-context settings reported success without persistence. Production-context secret creation persisted; read back names/scopes to verify.
- Runtime and connector authentication are separate. Connecting plugins does not configure local CLI/database credentials.
- Dynamic catalogue/admin/API responses use no-store where privacy and revocation require it. Staging remains noindex.
- APP_MODE=live on staging enables real managed functionality; it does not mean a production launch.
- Existing policy texts were explicitly approved by owner for staging. This is not a legal-compliance certification.

## Identity, sessions and recovery
- Owner authenticates on the WEBSITE Studio page using Supabase-backed password sign-in and TOTP. Supabase dashboard login is a separate identity flow.
- Normal storefront uses Google/magic-link sign-in; no normal customer password-login test should be promised.
- Keep app-side and provider CAPTCHA tokens separate to avoid consuming a one-use Turnstile token twice.
- Primary admin sign-in grants no business access until provider AAL2 and active admin membership are verified.
- TOTP enrollment restart removes only this flow's unfinished unverified factor; never delete verified/unrelated factors automatically.
- Backup-factor enrollment requires fresh verified owner access and uses unique factor names.
- A TOTP key shown during setup is intentional manual-enrollment material. Never publish it in screenshots; exposed setup material must be replaced.
- Session cookie is opaque, host-only, HttpOnly and secure on HTTPS. Provider credentials are encrypted server-side with A256GCM.
- Session encryption key MUST be 32 random bytes encoded as unpadded base64url (43 characters). The earlier generated 48-byte base64 key was invalid and was replaced.
- Admin sessions expire after 8 hours maximum or 30 minutes inactivity. Sensitive operations require MFA within 5 minutes. Closing/reopening a tab does not log out.
- Explicit logout revokes app sessions; SQL refresh lease coordinates provider refresh. Stale browser-session CSRF rotation handles expired sessions rather than crashing.
- Password reset uses /reset-password and a one-time recovery TokenHash in a URL fragment. Supabase email template points to the current staging origin.
- MFA-enabled password reset verifies an existing authenticator before changing the password. Never remove MFA or use a service-key password bypass to bypass that requirement.
- Recovery does not create a customer/admin application session. Provider global sign-out does not alone prove immediate invalidation of every existing access JWT; test the app policy.
- No invented native recovery codes or email-only MFA reset. Lost-device handling uses tested backup factor or independently verified operator procedure.

## Media, catalogue and enquiries
- Quarantine and sanitized Storage buckets are private. One-use session-bound tickets, full decode/re-encode, metadata removal, WebP and explicit review/publication are retained.
- Upload cap is 2 MiB to fit buffered Netlify requests; larger/customer upload design is later work.
- Public media reads recheck publication and use a checked no-store proxy. Avoid shared optimized-image caches for revocable private media.
- Hidden product/image must become unavailable immediately. Hosted test confirmed public 200 after publication and 404 after hide.
- Cleanup is live-only, bounded and scheduled hourly at minute 17 UTC. Backup/object-recovery drill remains deferred.
- Product saves rebuild safe projections. Supabase safeupdate rejected unqualified DELETE statements; migration 20261026164040 adds explicit id predicates. Protection remains enabled.
- Customer/guest enquiries reject Studio admin-session audience. Use another browser context or sign out to test a guest enquiry; do not widen SQL authorization.
- Enquiry saves record consent, an immutable estimate snapshot and a replay/idempotency record. WhatsApp opens a draft for the human to send.
- Preparing/opening a WhatsApp link must not mark a message sent, an order confirmed, payment received or shipment completed.
- Owner supplied business WhatsApp number and approved policy text; ownership/registration/physical-device handoff require actual verification.
- Test product PHASE1 TEST — DELETE LATER was used for disposable staging checks and subsequently hidden. Keep its draft/media and enquiry snapshot until cleanup is explicitly requested.

## Performance and security choices
- Checked-in licensed local Fraunces and Inter fonts. Fraunces display swap with preload off; Inter preload retained to limit layout shift.
- Hosted Lighthouse identified the bouquet hero as mobile LCP. Both above-fold hero images now receive priority/high fetch priority.
- Post-fix mobile lab run: performance 95, LCP 1.8 seconds, under 2.5-second target. This is a lab result, not real-user percentile proof.
- Nonce CSP, frame denial, nosniff, HTTPS headers and noindex remain. Netlify-injected HUD is blocked by CSP; do not weaken CSP simply to allow the toolbar.
- Managed Postgres atomic rate limits by default; optional Redis only when configured. HMAC IP/actor identifiers; no in-memory fallback.
- Browser checks in cloud used a certificate override only for the interception proxy. This is not origin TLS certification.
- Supabase advisory reports leaked-password protection disabled; track separately. Do not describe private deny-by-default RLS tables as broken merely because no browser policies exist.

## Backup and credential handling
- Database backup was created by owner using DBeaver/pg_dump for memocious, memocious_private and public schemas. Dump finished with no visible errors.
- This is an APPLICATION backup, not a complete Supabase disaster-recovery package. Auth/schema dependencies and Storage OBJECT BYTES need separate treatment.
- Never restore into the working Supabase database for a rehearsal. Use an isolated destination when resumed.
- DBeaver is a database client, not a local PostgreSQL server. Owner found no PostgreSQL service or Docker CLI locally and chose to defer installation/restore.
- Database password differs from website/Supabase account passwords. Pooler URI passwords need URL encoding; separate DBeaver password fields do not.
- Owner demonstrated a successful DBeaver connection. Never copy the password/connection URI from conversation into this file.
- API secret keys and database passwords are distinct; rotating the database password does not change API keys but can affect database integrations.
- SMTP production delivery requires a suitable verified sender/provider. Owner had no custom domain; do not claim production email readiness based solely on test recovery email delivery.

## Roadmap boundaries
- Phase 2: public content, reviews, wishlist, addresses, proof manager, enterprise forms; follow specification and inspect current code before selecting features.
- Phase 3: gift builder, drafts, customer uploads and retention/deletion.
- Phase 4: enquiry lifecycle, tracking, guest claims, exports/privacy deletion.
- Phase 5: advanced administration, Studio redesign, CSV, analytics, themes, session tools, backups.
- Phase 6: production SEO, sitemap/structured data, PWA/offline/cache, localization and device certification.
- Phase 7: hardening, monitoring/alerts, incident drills, compliance evidence and release operations.
- Phase 8: optional external payment/messaging/courier/CRM integrations; no provider selection is implied.
- Do not enable payments, courier integration or other later-phase functionality merely because contracts/placeholders exist.
- Preserve current release blockers honestly; deferrals permit development progress, not a production-readiness claim.

## Evidence references
Read alongside docs/specification.md, docs/requirements.md, docs/phase-1-current-status.md, docs/phase-1-owner-workflow-results.md, docs/phase-1-performance-pass.md and hosted verification notes. Append new decisions with dates; mark changed decisions superseded rather than silently rewriting history.
