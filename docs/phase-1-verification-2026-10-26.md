# Phase 1 verification — 26 October 2026

- Netlify deploy 6adf54fa903f4157763677bf is ready; commit 130d0bf contains MFA-aware password recovery. Netlify scanned 229 files without secret matches.
- Local production build passed.
- Local browser suite: 11 passed, 1 desktop skip for a mobile-only navigation test. Covers storefront ordering/filtering, escaped product notes, unavailable ordering, CSRF/provider denial, private no-store responses and isolated Studio product editing on desktop/mobile. Fixture tests are not hosted provider verification.
- Managed Supabase read-only query: 37 private tables, all RLS enabled, zero anon/authenticated direct private-table grants. Both quarantine and sanitized media buckets are private.
- Supabase security advisor: informational no-policy notices match deny-by-default private tables; leaked-password protection is disabled (warning). See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- Hosted HTTP/Lighthouse blocked: proxy CONNECT to memocious-staging-v2.netlify.app returned 403 even with command network permission. Environment domain allowlist needs that hostname.
- User said done after recovery correction; latest queried Auth log window did not independently establish a successful password change. Do not count it as independently verified.
- Still outstanding: hosted session refresh/logout/revocation, negative role/JWT tests, real media upload/approval/proxy, enquiry smoke, mobile LCP under 2.5s, physical device checks and isolated backup/restore rehearsal. No production restore attempted.
- Admin visual redesign deferred by user to Phase 5.
