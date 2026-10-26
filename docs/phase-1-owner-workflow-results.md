# Owner workflow verification — 26 October 2026

User confirmed detail save/edit persists across refresh, sanitized-image upload and preview persists, explicit logout requires authentication, and password plus TOTP re-login succeeds. Reopening Studio in the same signed-in browser correctly resumes its existing session.

Read-only managed checks confirmed private draft 68689e38-b177-497d-b808-3535aacb072d with sanitized 1280x960 image and saved alt text. Before approval public image returned 404. User approved image and published the clearly labelled test product; live product and WebP returned 200. Desktop/mobile browser render checked product heading/image and no horizontal overflow. Hidden lazy zoom image is not a broken visible image.

User submitted test guest enquiry in a separate browser. Managed records confirmed reference GFT-2610-000001-8TQ70QEVTCBK, quantity 1, test note, inquiry status, one consent record and one replay record. No WhatsApp message was sent by the agent. Admin sessions are intentionally rejected as enquiry actors; clearer route-level error was added.

User hid test product afterward. Live product and public image both returned 404. Draft/media and immutable enquiry evidence remain retained.

Fixed hosted database safeupdate incompatibility in publication refresh, applied migration 20261026164040, and verified refresh succeeds with safeupdate enabled in a rolled-back transaction. No real admin-session impersonation used.

Outstanding operational evidence: backup authenticator enrollment/recovery drill and isolated database plus object-store backup/restore. Only one verified TOTP factor exists. Connected tools cannot export database backups or retrieve storage credentials; the workspace has no configured service/database secret bindings or backup destination. Do not restore the live project or disable MFA to manufacture completion. Provider-session refresh and password recovery success require their own observed events, not inferred from ordinary login.
