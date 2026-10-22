# Memocious Project Context

Updated: 22 October 2026

## 1. Project identity

Memocious is a Next.js/React/TypeScript storefront for thoughtful gifts, backed by Supabase and hosted on Netlify. The project has a public customer-facing storefront and a protected owner/admin studio.

Primary staging site: https://memocious-staging.netlify.app

Admin/studio route: use the value configured in Netlify's `ADMIN_ROUTE` environment variable; do not commit or document its literal value.

GitHub repository: https://github.com/harshrhandore/Memocious-

Local project directory used during development: `/workspace/memocious`

## 2. Technology stack

- Next.js, React, TypeScript, Tailwind/CSS UI
- Supabase Auth and PostgreSQL
- Supabase Row Level Security and private Storage contracts
- Netlify hosting and deployment
- Cloudflare Turnstile challenge protection
- TOTP authenticator-based MFA
- GitHub repository and Netlify continuous deployment

The application is designed around a server-side/BFF boundary. Browser code should not receive private database grants, service-role credentials, or long-lived provider secrets.

## 3. Work performed

### Source and project setup

- Extracted the uploaded `memocious-delivery.zip` into the project workspace.
- Preserved the supplied documentation, specification, evidence, migrations, tests, and source layout.
- Added a Phase 1 checklist entry for the owner password-recovery callback and reset form.
- Created a clean source archive without dependencies, build output, environment files, secrets, or Git history.

### Public storefront

- Implemented the Memocious public home page and visual brand treatment.
- Implemented catalogue browsing, category/occasion navigation, filters, sorting, search limits, canonical routes, product details, gallery behavior, and honest unavailable states.
- Preserved the preview/illustrative nature of sample products and avoided fabricated reviews, testimonials, payment claims, or delivery guarantees.

### Admin/studio

- Implemented protected owner/admin studio screens.
- Added catalogue, taxonomy, settings, media, product, and bulk-operation interfaces.
- Added guarded owner/operator checks and recent-MFA expectations for sensitive actions.
- Added owner bootstrap and role handling in Supabase.

### Database and security

- Applied the supplied Supabase migrations.
- Added private tables, deny-by-default grants, RLS policies, safe projections, and role-aware access contracts.
- Implemented session registry concepts, encrypted session material, refresh leases, CSRF/session binding, rate-limit boundaries, and typed validation.
- Added private media/quarantine/approval contracts and protected image delivery behavior.

### Authentication and MFA

- Created the owner account `harshhandore7@gmail.com`.
- Implemented owner password login.
- Implemented TOTP enrollment and verification screens.
- Added Turnstile challenge handling.
- Added Supabase MFA factor management.
- Rotated the production session encryption key after the first hosted login failure.

### Netlify and deployment

- Created/configured the Netlify project `memocious-staging`.
- Configured required Supabase, application, Turnstile, session, and security environment variables.
- Added Netlify/Next configuration for the project.
- Added image optimization fallback settings to avoid broken `_next/image` requests in staging.
- Connected GitHub repository `harshrhandore/Memocious-` to Netlify.
- Published a production deploy from the `main` branch.

## 4. Verification already performed

- Local production build completed successfully.
- Local unit/database/security checks completed for the named test suites.
- Chromium/UI checks passed for the named public and isolated admin flows.
- Supabase migration, role, grant, and owner bootstrap checks passed for the available managed checks.
- Netlify currently reports a ready/published production deploy.

These results do not constitute a blanket production security or release certification. Provider-dependent and hosted checks remain separately listed below.

## 5. Current hosted state

The deployed site loads and the public storefront is available. The owner login page accepts the owner email/password and routes to the MFA screen.

Current hosted blocker: MFA enrollment is not completing reliably. Observed messages include:

- `Authenticator setup could not be completed.`
- `Check the verification details.`
- `Verification could not be completed.`
- temporary wait/rate-limit messages after repeated attempts.

The Supabase MFA factors were removed during troubleshooting so the owner can start fresh. The browser should be allowed to cool down before more attempts. Repeated clicks can extend the Turnstile or application rate limit.

The TOTP secret displayed during enrollment is intentionally shown so it can be entered into an authenticator app. It must never be shared. A secret shown in a screenshot should be treated as compromised and replaced.

## 6. Correct owner login/MFA flow

1. Open the admin/studio URL.
2. Enter the owner email and password on the admin login form.
3. Wait for Turnstile to show `Success`.
4. Select `Add an authenticator` once.
5. Copy the newly displayed secret into Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.
6. Select the new factor in the dropdown.
7. Enter the current six-digit TOTP code.
8. Select `Verify & continue`.

No normal storefront-user login is required for this owner flow.

## 7. Phase 1 remaining work

Phase 1 must not be marked complete until these items pass on the hosted site:

1. Fix MFA enrollment and verify the real Supabase factor end to end.
2. Verify owner login, wrong-password behavior, session creation, refresh, logout, and revocation.
3. Implement and verify the Supabase password-recovery callback and reset form. The current recovery link can fall back to the homepage.
4. Verify owner-only admin access, editor/role boundaries, Supabase JWT behavior, RLS, and private Storage denial.
5. Verify media upload/quarantine/approval/private preview/proxy routes in the hosted environment.
6. Run hosted smoke tests for homepage, catalogue, product detail, enquiry, media, admin, login, and session routes.
7. Re-run Lighthouse after the image fix and confirm mobile LCP below 2.5 seconds.
8. Complete hosted headers/TLS/security checks, backup/restore rehearsal, device checks, and release evidence.

## 8. LCP and performance context

LCP means Largest Contentful Paint: the time until the largest meaningful visible element in the viewport is rendered. It is a user-perceived loading metric, not simply server response time. Large hero images, font loading, render-blocking CSS/JavaScript, and slow image delivery can increase it.

The project previously measured above the Phase 1 target. Image handling was changed to avoid broken optimized-image routes. A fresh hosted Lighthouse run is still required to confirm whether the target of less than 2.5 seconds is met.

## 9. SMTP and email context

Supabase email delivery is currently provider-dependent. Custom SMTP requires a verified sender address and SMTP credentials from a provider such as Resend, Brevo, Mailgun, or another SMTP service. A domain is not currently owned, so production sender-domain verification cannot be completed yet. Temporary/testing senders are suitable only for testing, not production.

## 10. Later phases

- Phase 2: public content, reviews, wishlist, addresses, proof manager, and enterprise forms.
- Phase 3: gift builder, customer drafts, customer uploads, retention, and deletion workflows.
- Phase 4: enquiry lifecycle, tracking, guest claims, exports, and privacy deletion flows.
- Phase 5: advanced administration, CSV tools, analytics, themes, session tools, and backups.
- Phase 6: production SEO, sitemap/structured data, PWA, offline behavior, caching, translations, and device certification.
- Phase 7: security hardening, monitoring, alerts, incident drills, compliance evidence, and release operations.
- Phase 8: optional payment, messaging, courier, CRM, or other third-party integrations.

Later-phase functionality is intentionally disabled or represented only by reserved contracts. It must not be described as complete.

## 11. Source archive

The source-only archive is available from the workspace as `memocious-source.zip`. It contains source code, assets, migrations, tests, documentation, and configuration. It excludes `node_modules`, `.next`, `.netlify`, TypeScript build metadata, `.env` files, secrets, and Git history.

## 12. Important operating rules

- Never commit or share `.env` files, service-role keys, JWT secrets, session keys, SMTP passwords, or Turnstile secret keys.
- Do not repeatedly retry MFA or Turnstile while a cooldown message is visible.
- Do not claim Phase 1 complete until hosted provider-dependent checks pass.
- Do not enable customer ordering, payment, rich tracking, or later-phase features prematurely.
- Preserve the existing Supabase project, migrations, role records, and Netlify site; do not recreate them unless explicitly required.
