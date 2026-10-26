# Memocious

Responsive Next.js storefront and protected Studio. Staging is live at https://memocious-staging-v2.netlify.app. Owner login/MFA, product editing/media/publication, guest enquiries and public media revocation have hosted evidence; Phase 1 mobile Lighthouse scored 95 with LCP 1.8s. The owner tested the backup authenticator.

Phase 2 feature implementation is present: home/trust carousel, reviews/moderation, wishlist/addresses/privacy baseline, enterprise/contact transactions, quotes/proof/catalogue management and consented media. It is behind the default-off `PHASE_2_ENABLED` rollout flag. **Apply the new migrations before enabling; GitHub main auto-deploys app code but does not migrate Supabase.** See [Phase 2 results and owner guide](docs/phase-2-results.md) and [current Phase 1 status](docs/phase-1-current-status.md). Hosted Phase 2 acceptance is not claimed complete.

Phase 3 has started with a four-step custom-gift draft editor and default-off `PHASE_3_ENABLED` saving gate. [Draft foundation and blocked prerequisites](docs/phase-3-progress.md) distinguish this increment from the unfinished full builder.

Password-reset credential replacement and physical-phone navigation/WhatsApp remain manual. The owner deferred both database and image-file restore rehearsal until before production; this does not block Phase 2. Studio visual redesign remains Phase 5. No production release is asserted.

Ten illustrated sample products are local demo fixtures. Ten explicitly labelled sample drafts also exist privately in the dedicated managed project; none is published. Their images must go through the real upload/review workflow. Business WhatsApp 918446572382 and approval of the existing policy texts were supplied by the user. This does not establish WhatsApp registration, legal compliance or operational readiness. Demo mode collects no enquiries or sign-ins.

## Run

Use Node **24.19.0** and npm **11.9.0**. Next16.4.2, React19.3.1, TypeScript6.0.3 and dependencies are pinned.

```sh
npm ci
npm run build
npm start
# http://localhost:3000
```

No environment file is required for the labelled read-only demo. For live staging, use the host secret manager and `.env.example`; never put service keys in client-prefixed variables or chat. `APP_MODE=live` requires real protection and identity configuration. Default rate limiting uses managed Postgres atomic counters; Redis is optional.

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run scan:secrets
npm run test:e2e
```

Build before E2E. Playwright can start the production server and the isolated Studio UI harness. Chromium defaults to `/usr/bin/chromium`; override `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when needed. UI harness responses and embedded PostgreSQL Auth/Storage stubs do not certify managed Auth, MFA, Storage or multi-worker concurrency.

## Connected services

- [Dedicated Supabase project](https://supabase.com/dashboard/project/bpvtdehesnlgwccmrlhz): Mumbai, 39 canonical applied migrations, 37 private RLS tables, three public-safe projection tables, two private media buckets. No owner is provisioned.
- [Netlify memocious-staging](https://app.netlify.com/projects/memocious-staging): created in Caffeine Coders; Supabase extension installed with explicit user approval. No deploy exists. Eight ordinary site settings read back correctly; secret/provider bindings remain unverified. Workspace policy still blocks `api.netlify.com`.

Use [operations](docs/operations.md) for exact setup, operator-only owner bootstrap, media publication and recovery. [Checkpoint](docs/checkpoint.md), [requirements](docs/requirements.md), [evidence](docs/evidence.md), [API](docs/api.md), [decisions](docs/decisions.md) and [architecture](docs/architecture.md) distinguish implemented code from observed checks. The original [specification](docs/specification.md) is preserved.

`supabase/migrations/` is the authoritative applied history; versions match Supabase. Do not replay it blindly against populated data. Native migration tools were used because the CLI attempted to write its read-only home directory. Generated database types match the current schema.

Reviews, wishlist, builder, tracking, enterprise submissions, customer uploads, exports/erasure and later operational workers remain disabled. No Phase 8 provider is selected. There is no production release, real recovery/backup drill or blanket security/compliance claim.
