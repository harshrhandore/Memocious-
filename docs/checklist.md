# Dependency-aware Phase1 checklist

| Work | State |
|---|---|
| Isolated repo, pinned stack, CI, preserved specification and later contracts | Implemented; remote CI not run |
| Mobile storefront, typed options, gallery, filters/sorts/canonicals and honest unavailable states | Implemented; Chromium checks pass |
|39 canonical migrations,37 privateRLS tables, safe projections, two private media buckets | Applied; managed grant/role checks pass |
| Full product/taxonomy/settings Studio and count/version-bound bulk deletion | Implemented; localSQL and desktop/mobile isolatedUI pass |
| Quarantine/decode/metadata strip/private preview/approval/reorder/proxy/cleanup | Implemented; local decoder/SQL pass; hosted objects/scheduler blocked |
| Managed identity, opaque sessions, refresh lease, consent/CSRF, TOTP and operator bootstrap | Implemented; actual managed owner/provider flows blocked |
| Owner password-recovery route and password-reset form (Supabase recovery callback, redirect allow-list, expiry/error handling) | TODO; current recovery link falls back to the homepage and cannot complete owner recovery |
| Atomic distributed limits, trusted ingress and distinct challenge tokens | Implemented; native counter boundary passes; hosted spoof/concurrency/outage tests blocked |
| Business number and existing policy-text approval | Supplied and recorded; registration/legal/retention operational review remains |
| Netlify project and approved Supabase extension | Created/installed; public env readback verified; no deployment/secret verification |
| Build/typecheck/unit/localDB/E2E/dependency/secret/SAST checks | Named evidence in evidence.md; no blanket security claim |
| Stable mobileLCP<2.5s | Unmet; latest controlled measurement retained |
| RealAuth/MFA/recovery/directJWT/Storage/hostedBFF matrix | Blocked setup; cannot be replaced by fixtures |
| DB+blob backup/restore and incident drills; devices/TLS/external scanner | Unexecuted; release blocked |
| Phase2–8 features | Preserved in ledger/specification; dependent features disabled |

Do not mark Phase1 complete or switch on real customer collection until the specification’s actual managed-provider/BFF security gates pass. Continue from checkpoint.md without recreating projects or reapplying migrations.
