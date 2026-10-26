# Current status - 27 October 2026

This update supersedes older no-deployment/no-owner and outstanding-work statements below and in the requirements ledger. Current staging: https://memocious-staging-v2.netlify.app ; Supabase: bpvtdehesnlgwccmrlhz.

Hosted evidence establishes owner login/MFA, edit persistence, sanitized media upload/preview, publication/hiding, guest enquiry persistence and public media revocation. Mobile Lighthouse performance was 95, LCP 1.8 seconds (lab evidence). Owner reports backup authenticator tested.

Remaining manual checks: password reset followed by new-password success and old-password denial; physical-phone navigation and WhatsApp handoff. Do not infer these from ordinary login or browser simulation.

Owner explicitly deferred BOTH database and image-file backup/restore rehearsal. This remains required before production release and does not block Phase 2 development. Studio appearance/usability redesign remains deferred to Phase 5.

Phase 2 local wishlist implementation and its precise verification limits are recorded in phase-2-wishlist.md. Phase 2 is not complete. No production release is asserted.

---
Historical status follows; its outstanding list is superseded by the update above.

# Phase 1 status — 26 October 2026

This note supersedes older deployment and owner-access statements in checkpoint.md.

## Observed

- Replacement Netlify staging project: memocious-staging-v2.
- Owner reports successful sign-in and shows the protected Studio product list containing ten private sample drafts.
- Initial login/MFA access blocker is cleared by user observation. Repeat sign-in, session refresh, logout, revocation and negative authorization tests remain to be recorded.

## Remaining Phase 1 work

1. Implement and verify password-recovery callback/reset form; verify email delivery and redirects for the replacement origin. Production SMTP remains dependent on a verified sender.
2. Verify wrong-password handling, repeat MFA sign-in, session refresh/logout/revocation and backup-factor/recovery procedure.
3. Verify owner/editor/customer/anonymous boundaries, direct JWT access, RLS and private Storage denial.
4. Exercise hosted product edit and media upload/quarantine/preview/approval/proxy flows using disposable test data.
5. Run hosted homepage/catalogue/product/enquiry/session/admin/media smoke checks.
6. Measure hosted mobile Lighthouse and meet LCP under 2.5 seconds; previous controlled measurement was 2.8–2.9 seconds.
7. Record headers/TLS, device checks, backup/restore rehearsal and release evidence.

## Deferred design work

User explicitly deferred Studio appearance changes. Schedule the admin layout/usability redesign in Phase 5 (advanced administration), including responsive product management, visual hierarchy, compact actions and clearer authentication/setup wording. Do not block Phase 1 on cosmetic redesign. Functional accessibility defects remain in scope when encountered.

No Phase 1 completion or production release is asserted by this note.
