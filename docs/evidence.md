# Verification and practical limits

Application source tested: **7cf9f3cb43affc5fb870759d4c964b58224e5e5d** (Studio/security26c6c44, favicon4bdd846, font loading and fresh Studio fixture7cf9f3c). Linux, Node24.19.0, Next16.4.2 production server,21 October2026. Subsequent evidence/documentation commits do not alter application behavior. Phase1 is incomplete; these are bounded observations.

| Check | Outcome and scope | Evidence |
|---|---|---|
| Build/typecheck | PASS; final build includes the font-priority change and compiler check | build-font-priority-phase1.txt; earlier typecheck-phase1.txt |
| Lint | Exit0,18 warnings/19 infos; style/cascade/optional-chain/useConst/template suggestions, no errors | lint-phase1.txt |
| Units |13 PASS: strict schemas/options, media magic/full decode/dimensions/metadata/animation rejection, zero/null, redirects, WhatsApp encoding/bounds, role/idle guards, ingress validation, jose current/previous/tampered key handling | unit-phase1.txt; tests/*.test.ts |
| Local database | PASS all39 migrations reset in embeddedPostgreSQL; original enquiry/grants/history suite plus admin media/publication/quota/options/MOQ/message/stale-bulk/taxonomy/browse-gate/owner-bootstrap/revoked-owner/aal1/recent-MFA/rate assertions | db-phase1.txt, local-postgres.json, tests/database.sql, tests/admin-database.sql |
| Query scale |10,000 synthetic local public rows, bounded24 page and EXPLAIN; not managed latency/load/cost | scale-postgres.json |
| Managed grants |37 private tables allRLS;0 browser private grants and0 exposed businessRPCs | supabase-grants-phase1.json |
| Managed direct role checks | Prior anon public SELECT succeeds, authenticated private SELECT and anon sessionRPC denied42501; current authenticated media-reservationRPC also denied42501 in native SQL role attempt. These are SQL roles, not actual signed A/B/adminJWT tests | supabase-direct-checks.json plus native tool trace |
| Managed rate boundary | Service-role transaction exercised auth first5 allowed/sixth denied with retry window; rollback | supabase-rate-phase1.json |
| Managed migrations/advisors |39 applied versions;37 informational RLS/no-policy notices deliberate for private deny-by-default tables | migration-registry-phase1.json, supabase-advisors-phase1.json |
| Browser |11 PASS/1 skip (desktop mobile-only navigation); desktop1440×1000/mobile390×844. Includes2 actualStudio editor tests with isolated API fixtures, typed price/options and exact deletion confirmation. Fixture now starts fresh on every run so CSS hashes/editor bundle match the build | e2e-font-priority-phase1.txt, playwright.json |
| Automated accessibility | Axe WCAG2A/AA and2.1AA in named storefront and isolatedStudio tests; no violations there. Not fullWCAG or screen-reader certification | tests/e2e; playwright.json |
| Responsive/offline |360/390/768/1024/1280/1536 widths: no document overflow or captured page errors. Worker cache only offlineHTML+2icons after account visit; truthful offline no-submission fallback | browser-preview.json, screenshots |
| Dependencies | npm audit0 known vulnerabilities at scan time | npm-audit.json |
| SAST | Semgrep203 official JS/TS rules,84target files,0scan/parse errors,0ERROR,11WARNING and269INFO; disposition below | semgrep-phase1.json |
| Secrets | Pattern scan of unignored working files plus all available non-shallow Git blob history: no matches; exact counts in latest report. Does not recognize every possible credential format or prove revocation | secret-scan.json |
| Hosting | Existing Netlify project, approved extension installed,8 ordinary settings read back. No deploy; secret/extension binding unverified; running network policy blocks Netlify API | hosting-phase1.json |

## Static findings review

All11 Semgrep warnings are `javascript.lang.security.html-in-template-string`: nine in the offline illustration generator and two in the isolated loopback Studio test harness. The generator interpolates only checked-in numeric/color/art constants. The harness interpolates local compiled CSS filenames and never request/customer data; it is not deployed as an application route. No runtime untrusted-input XSS path was identified in those findings.269INFO findings recommend English internationalization; optional translations remain disabled. This is a community-rule scan, not a complete interfile exploit audit.

The37 managed advisor notices flag RLS tables without browser policies. They deliberately deny browser access, paired with revoked schema/table/function privileges; adding permissive policies merely to silence them would weaken the boundary. Service-role operations bypassRLS and rely on independent session/role assertions; they are not counted as RLS success tests.

## Measured mobile lab runs

Lighthouse13.5.0, Chromium154 onLinux, localhost production build, mobile simulation/default throttling. Scores and resource timings describe lab conditions, not physical Android/4G hosting. Preview intentionally stays noindex, limiting SEO score. All raw runs are retained.

| Report | Context | Performance | Accessibility | Best Practices | SEO | LCP |
|---|---|---:|---:|---:|---:|---:|
| lighthouse-mobile-2 / mobile-3 (historic) | Prior storefront revision53ca01c |89/91|100|100|66|3.5/3.4s|
| lighthouse-phase1 | Before font trim |92|100|100|66|3.3s|
| lighthouse-fonts-phase1 | Fonts trimmed |94|100|100|66|3.0s|
| lighthouse-final-phase1 | Overlapped E2ECPU load; not a controlled comparison |88|100|96|69|3.2s|
| lighthouse-standalone-phase1 | Controlled, favicon still404 |95|100|96|69|3.0s|
| lighthouse-release-check-phase1 | Final controlled, favicon fixed; no console errors |94|100|100|69|3.0s|
| lighthouse-font-priority-phase1 | Decorative fonts discovered through CSS; body font still preloaded |95|100|100|69|2.8s|
| lighthouse-critical-images-phase1 | Trial deferring all fonts; body font preload subsequently restored because CLS rose to0.030 |95|100|100|69|2.9s|
| lighthouse-font-priority-confirm-phase1 | Final controlled confirmation, body preload restored; CLS0.002 |95|100|100|69|2.9s|

**LCP<2.5s remains unmet.** Font bytes fell131KB→78KB; prioritizing hero images ahead of decorative-font preloads improved measured LCP to2.8–2.9s with performance95 and CLS0.002. This does not pass the combined target. Do not remove the browse/privacy/indexing boundaries to improve scores. Real hosting/database/network and device measurements remain required.

## Published network settings and running worker

The user supplied a screenshot showing `api.netlify.com` saved under Additional allowed domains and confirmed publishing it. The latest runtime snapshot is revision36, enforced/current, but still references the earlier source configuration version and has no added hosts. A direct request at15:10:03UTC still received proxyCONNECT403 before Netlify. This is a saved-setting/runtime mismatch, not an incorrect domain entry. Available tools can inspect runtime state but cannot restart it or apply a new source configuration version. Repeating the domain edit is not a verified fix; a supported restart/configuration attachment or platform resolution is needed. No deployment or CLI authorization is claimed.

## Unexecuted release gates

- Managed Google/email identity, genuine sender/CAPTCHA, owner provisioning/TOTP/backup factor/recovery, refresh concurrency/key transitions, logout/providerJWT windows and revoked/editor roles through actual browser→BFF→managedSQL flows.
- Signed anon/userA/userB/adminaal1/aal2 DataAPI/RPC/Storage matrix, hosted image upload/approval/hide/revoke/cache/decoder failures and orphan cleanup schedule.
- Multi-worker enquiry/idempotency and rate concurrency, real ingress spoof/header overwrite, Turnstile expiry/replay/outage/provider compatibility/backoff.
- DeployedTLS/HSTS/CDN/external security scanner/ZAP, physical iPhone/Android/desktop WhatsApp, actual PWAinstall/update and screen-reader checks.
- EncryptedDB+object backup/restore, job reconciliation, measuredRPO/RTO, monitoring/alerts, owner training and operational retention/privacy review.

Local DB fixtures stub Auth/Storage catalogs; UI fixtures intercept API responses without authenticating. Neither can satisfy the brief’s explicit managed-provider definition of done. There is no production deployment, security certification, native recovery-code claim or completed backup drill. Earlier reports without the phase1 suffix describe earlier source and are retained as historical evidence.
