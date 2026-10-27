# Current operations and incident runbooks - 28 October 2026

These instructions supersede historical no-owner/no-deploy setup in operations.md. Runbooks are preparation, not completed recovery drills.

## Existing installation

Use `https://memocious-staging-v2.netlify.app` and Supabase `bpvtdehesnlgwccmrlhz`. The owner and MFA already exist; do not reset the database, rerun bootstrap or recreate factors. Latest recorded hosted revision is `77275df4891b4aca446115e3dbfd7c2573f862b9`; later deploys were skipped for exhausted credits. This document is not a new live provider query. GitHub main triggers Netlify deploy attempts: explain before pushing. Do not buy capacity/change plans silently.

Hosted Phase 1 owner/edit/media/enquiry/revocation evidence and the owner-tested backup authenticator remain valid within their documented scope. Password-reset credential replacement, physical-phone workflows and later positive integrations remain unverified. BOTH database and image-file restore rehearsals remain owner-deferred and required before production. See [current status](phase-1-current-status.md), [Phase 3](phase-3-progress.md) and [Phase 7](phase-7-progress.md).

Use Node 24.19.0, the lockfile and ordinary isolated checks: build, unit, lint, secret scan; SQL changes require embedded PostgreSQL checks. Keep actual environment files, credentials, backups, node_modules and build output outside Git/public artifacts. The withdrawn local live-provider integration-testing proposal remains withdrawn.

| Capability           | Recorded remote status                                                | Rollout boundary                                                  |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Phases 2/3           | Migrations applied; flags configured true, current code not published | SQL/flag state does not establish positive integration acceptance |
| Phase 4 timelines and pre-dispatch owner actions | Migrations `20261027120000` and `20261027183624` not applied | Default-off flag; verify schema and prerequisites before enabling |
| Phase 5 Studio/audit | Migration `20261027130000` not applied                                | Default-off flag; owner/fresh-MFA audit guard remains required    |
| Phase 6 metadata     | No migration                                                          | Default-off flag; indexing remains disabled                       |

Before any later rollout, inspect actual remote migration ledger, flags and deployed revision. Apply only missing reviewed additive migrations in filename order; never use hosted `db reset` or reapply already recorded migrations. Verify code/schema compatibility before enabling a feature. Changes to this table must accompany later migration work.

When capacity is restored AND the owner resumes postponed checks, deploy the reviewed revision to the existing stable staging origin and confirm the exact published commit/runtime variables. Keep `APP_ORIGIN` exact, secrets server-only, trusted Netlify ingress, distributed limits, approved Auth/CAPTCHA domains, private no-store and noindex. Do not disable CSRF/MFA/CAPTCHA to make a preview work. Verify actual cleanup scheduling rather than inferring execution from repository code.

## Owner workflow limits

Use the privately supplied Studio path and existing owner/TOTP. Products begin as drafts. Blank price means quote, zero is real zero; version conflicts need review. Upload still JPEG/PNG/WebP <=2 MiB and 20 megapixels, inspect sanitized private preview/alt/order, then deliberately publish genuine content. HEIC/animated inputs need conversion. Hide/removal revokes subsequent app access, not downloaded copies. Builder/reference files stay private.

Deletion requires exact selection/count/confirmation and current authority; permanent deletion requires soft-deleted records and fresh MFA. Preserve order snapshots/audits. Phase 3 quote/conversion is implemented but hosted acceptance is deferred. Record genuine agreement; conversion/WhatsApp clicks do not prove payment. Phase 4 pre-dispatch owner actions/offline receipt/refund records are locally implemented behind its default-off flag and unapplied migrations; dispatch remains blocked. Consult phase ledgers before promising operational capabilities.

## Containment and application rollback - not drilled

1. Record UTC time, affected revision/provider, scope and minimal request IDs privately. Exclude customer content, cookie/token values and credential-bearing URLs. Identify the authorized incident operator.
2. Stop the affected writes using existing feature flags or a reviewed maintenance deployment. Preserve safe reads when possible. Do not weaken auth or blanket-delete records. Credit-exhausted skipped deploys do not change the live app.
3. Disable the affected phase flag or publish the last reviewed compatible revision on the existing host. Verify the actually published revision and rejection of the affected action. Check schema compatibility first: application rollback does not reverse transactions/migrations. Preserve additive tables/history and prefer a reviewed corrective forward migration for data errors.
4. Revoke affected app registry sessions/grants AND provider sessions through supported operator procedures. Later verify cookie reuse, refresh and new sign-in behavior. Deleting a browser cookie/rotating a service key alone does not prove all JWTs invalid.
5. Inspect pending outbox/cleanup work before controlled replay. Record recovery owner, findings and follow-up checks; do not infer resolution from a green build.

## Credentials and lost MFA - not drilled

Keep a private inventory of credential owners/environments and review at least every 90 days or immediately on exposure. Rotate provider/host credentials through supported controls, update correct secret scopes, deploy, verify current access and old-credential denial. Do not print values or remove secret protections to retrieve them. Signing keys, service keys, app encryption keys and provider sessions have distinct revocation effects.

For encryption-key rotation, set a new `SESSION_KEY_VERSION`/`SESSION_ENCRYPTION_KEY` and a deliberately bounded previous-version map through host secrets. Coordinate every active runtime. Confirm refresh/revocation before retiring old keys; source crypto tests are not an operational drill. Keeping a compromised key as a previous key requires an incident decision and session containment.

Use the owner-tested backup authenticator if the primary is lost. If neither works, independently verify the owner and use restricted supported provider recovery, record it privately, revoke sessions and test replacement/old-factor denial. Never bootstrap another owner or bypass MFA based on chat/email alone. No native recovery-code or completed full factor-reset drill is promised.

## DB AND image-file recovery - owner-deferred

Do not restore now. When resumed, choose an isolated destination that cannot overwrite the existing project. Inventory actual provider capabilities, DB records/schema/migrations, Storage objects/metadata and encryption-key recovery. Encrypt exports, separate backup keys/access from app keys, define retention and verify an off-site destination. Backups stay outside Git and public artifacts.

Suppress destination notifications, provider actions and cleanup/job replay BEFORE restore. Restore records and files consistently; verify versions, checksums/object counts, private access/ownership, historical orders/events, audits and pending-job reconciliation. Verify old/revoked-session denial without recreating the live owner. Reconcile jobs before controlled enablement. Measure data-loss window and recovery start/end plus functional recovery time. Proposed RPO <=24h/RTO <=8h are targets, not achieved promises. Record failures and rerun affected checks. DB-only recovery cannot pass this gate.

## Retention, messaging and release

Private buckets and checked no-store proxies deliberately avoid public image-optimizer caching. Bounded cleanup code retries failed removals; later-phase actual scheduler execution and alerts remain unverified. Preserve job records until storage acknowledgement. Disappearing UI content is not proof of physical deletion. Account erasure remains a request with retention review, not immediate removal from historical orders/backups/third-party chats.

WhatsApp stays a manual link/copy handoff; the user presses Send. Saved enquiry, click, message delivery, agreement, payment and fulfilment are distinct. Verify number ownership/registration and phone handoff when resumed. No automatic messaging/payment/courier integration is selected.

Production requires specification 16.6/17.7: finish unbuilt core features; postponed provider/device checks; both restore rehearsals and incident drills; deployed TLS/CSP/header/DAST evidence; actual usage/availability/job/backup alerts; genuine domain/contact/policies/media rights and owner/legal decisions; owner phone training and controlled genuine-order soft launch. A real monitored security contact is required before publishing security.txt. No approval, scanner grade, measured recovery or production launch is invented by this guide.
