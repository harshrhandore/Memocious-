# Owner and operator guide

## Current state

Build and run the labelled demo with `npm ci`, `npm run build`, `npm start`. Sample media/products are illustrations, not inventory. Sign-in and enquiries stay disabled in demo. The dedicated managed project has ten private labelled sample drafts and zero published products/owners. The supplied business number and approval of existing policy texts are recorded; verify registration, content rights and operational terms before real customers.

## Hosting and identity prerequisites

Use the existing [memocious-staging Netlify project](https://app.netlify.com/projects/memocious-staging), site3085b325-fb79-4e87-9c6e-c1b6f54059ae, in Caffeine Coders. Do not create another database or project. Its intended stable origin is https://memocious-staging.netlify.app; it currently has no deploy. `netlify.toml` uses Next's adapter, Node24.19.0, build npm run build and publish .next; no SPA catch-all is appropriate.

1. The user has saved and published api.netlify.com correctly. The running worker at observed revision36 still uses the earlier configuration version with no custom hosts; CLI CONNECT is denied before Netlify. Resolve the published-setting/runtime mismatch using a supported apply/restart/configuration-attachment workflow or platform support. Do not ask for the same domain edit again. The connected plugin cannot upload a deploy or provide CLI credentials. After connectivity, complete supported CLI browser authorization; do not paste a token into chat.
2. Netlify's Supabase extension is installed team-wide with explicit approval. In project configuration select existing Memocious bpvtdehesnlgwccmrlhz, Other/no public prefix, Save. No extension credentials currently read back. Eight ordinary settings are verified; granular scopes did not persist on this Free team. Secret creation was acknowledged but no secret key appears in readback. Resolve through supported host settings without changing secret flags to reveal values or buying a plan silently.
3. Set runtime bindings from .env.example through host secrets. SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is server-only. Generate independent 32-byte session/IP keys and random ADMIN_ROUTE; never expose them in NEXT_PUBLIC variables or artifacts. Set exact HTTPS origin, TRUSTED_INGRESS=netlify and RATE_LIMIT_STORE=postgres. Keep APP_MODE=demo until protections are verified. Site scope precedence is independent per scope; Builds-only settings do not override runtime values.
4. Configure real Turnstile site/secret keys, Supabase CAPTCHA, Google OAuth exact callbacks and email-link sender/redirect allowlists. BFF and provider CAPTCHA tokens are separate. No test-key bypass is shipped. Runtime must reach Supabase and Turnstile; plugin connectivity does not establish app egress.
5. Deploy to the primary URL of this staging-only project with the exact APP_ORIGIN. A random deploy-preview hostname will fail strict mutation origin checks. A primary deployment here is still staging; do not call it production or accept real data before the gates pass.

## Operator-only owner bootstrap

Create/verify the intended managed identity through the supported provider account process. The supplied owner email is an operator input, not a public support address. Current lookup found no account. Do not create a default password or grant roles from editable metadata/first signup.

Run `node scripts/bootstrap-owner.mjs` in a trusted operator runtime with OWNER_EMAIL, SUPABASE_URL and the server key set via secret settings. The script looks up an existing verified nonanonymous account and invokes a service-only bootstrap with its UUID and email hash; it rejects an existing owner/membership. It does not set passwords or expose an app bootstrap route. Output contains no email/password/token. Do not rerun it as a recovery shortcut.

Open the privately supplied ADMIN_ROUTE. Sign in with the provisioned owner account, then enroll and verify TOTP. aal1 only accesses factor setup; SQL and BFF require actual provider aal2 plus active membership for business operations. Add and test a backup factor after current owner verification. No native recovery codes are promised. Real enrollment, refresh concurrency, factor removal/recovery, role revocation and cookie tests remain blockers.

## Phone Studio workflow (implemented, managed integration unverified)

- Products → Add product creates a private draft. Enter integer-compatible rupee prices (blank means quote; zero is real zero), full details/materials/dimensions, MOQ/lead time, multiple categories/occasions, bounded colour/size/add-on groups and SEO. Saving an old version returns a conflict rather than overwriting another edit.
- Reopen Edit details & media. Choose a still JPEG/PNG/WebP<=2MiB and20MP, add alt text, upload, then inspect the sanitized preview. HEIC/animated/unsupported files need conversion. Each ticket is one-use/session-bound; input is quarantined privately and fully decoded/re-encoded without metadata. New media remains private until explicitly approved/published. Set numeric position and alt text to reorder/edit; unpublish/remove revokes subsequent proxy requests.
- Publish product only after media/taxonomy/content review. Publication requires approved media and active taxonomy ancestry. Hidden parent categories suppress children. Duplicate creates a private draft without automatically copying media.
- Select products for soft/permanent deletion or choose all. Review exact count and type DELETE n. Plan hashes bind IDs and versions; a concurrent change requires a new plan. Permanent deletion requires already soft-deleted products. Owner verification within five minutes is required. Order snapshots/audit history remain.
- Taxonomy → Add or Rename, reorder or hide; parent cycles are rejected. Settings → typed brand/tagline/contact/WhatsApp and browse-login flag. Settings need current owner and fresh MFA. The managed browse flag also gates direct public projection access and reduces discoverability/SEO when enabled.

Desktop/mobile fixture tests exercise the actual editor and confirmation UI; they do not prove real owner authentication or hosted uploads.

## Media cleanup

Both memocious-quarantine and memocious-sanitized buckets are private with browser-deny policies. Approved catalogue images are delivered through checked no-store proxies, not public bucket URLs or revocable-looking shared image caches. This trades CDN efficiency for reliable visibility checks. Input/output2MiB is intentionally stricter than the brief's5MiB ceiling to fit Netlify's buffered request limits; a future larger direct-upload design requires separate review.

`netlify/functions/media-cleanup.mjs` is scheduled hourly at minute17 UTC, runs only APP_MODE=live, processes at most25 jobs in20seconds with bounded network calls, and retries failed/orphan cleanup later. Operator equivalent: `node scripts/cleanup-media.mjs`. No hosted schedule or object-store recovery drill has run. Customer private uploads/retention are later phases.

## WhatsApp and consent

The supplied number is normalized to 918446572382 and read from managed public settings; the demo snapshot is explicitly separate. Verify ownership and WhatsApp registration manually. Sign-in and enquiry consent precede collection and record versioned SQL consent. Saved enquiries offer a genuine anchor/copy/manual fallback; the customer presses Send. Clicking never marks confirmation/payment/shipping. Device/app handoff remains untested.

## Compromise and recovery

Stop new writes, revoke affected app registry sessions/grants, rotate provider/host credentials through supported procedures, redeploy and verify old-session denial. SESSION_PREVIOUS_KEYS is an explicit version→key map for a reviewed bounded transition; current/previous/tampered ciphertext tests pass locally. Retire old keys after the intended window and verify actual session refresh/revocation. Removing a cookie alone does not revoke provider JWTs.

For lost TOTP, use the tested backup factor or independently verified operator procedure, revoke sessions, reset factors using supported Supabase controls and audit/test the replacement. No email-only or chatbot bypass exists. This procedure still needs an actual drill before real data.

Establish encrypted database plus object backups, separate access/keys, retention and an isolated restore. Suppress notification/job replay until reconciled. No backup restoration, measured RPO/RTO or live incident alert system is claimed. Roll back via reviewed restore/corrective migrations; never drop business schemas as a routine rollback.

Reviews, builder, enterprise forms, tracking, exports/erasure, CSV and later order/notification workflows remain disabled. Owner supplies real inventory/media/contact/policy/retention decisions; operator completes hosting/provider/recovery/backups; developer verifies the actual BFF/provider/token matrix and remaining performance/security checks.
