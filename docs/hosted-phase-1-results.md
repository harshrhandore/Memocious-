# Hosted Phase 1 checks — 26 October 2026

Desktop (1440px) and mobile (390px) checks passed for home, shop, login, password reset and owner login: HTTP 200, no broken loaded images and no horizontal overflow. Anonymous admin workspace and media requests returned 401 with private,no-store. Auth/product/enquiry/recovery POSTs without CSRF returned 403.

Mobile Lighthouse baseline through the workspace proxy: performance 70, accessibility 100, best practices 92, SEO 69, simulated LCP 2.8s. HTTPS browser testing required a certificate override for the workspace interception proxy; this does not certify origin TLS. Netlify injected HUD script is blocked by the site's CSP; staging intentionally prevents indexing.

Lighthouse identifies the bouquet hero image as LCP and flags its lazy loading. Commit 4e73b9a prioritizes this image. Build, TypeScript and 15 unit tests pass; shallow source/history pattern secret scan passes. At last check the published deployment was still the earlier recovery commit, so post-fix LCP remains unmeasured.

Outstanding: confirm deployment of image-priority fix and repeat Lighthouse; authenticated session/media/enquiry positive workflows; backup-factor recovery procedure; isolated database/object restore rehearsal and physical device evidence. These require an owner-controlled session or isolated backup destination/credentials, unavailable to the runner. No owner credentials requested or stored. Admin redesign remains deferred to Phase 5.
