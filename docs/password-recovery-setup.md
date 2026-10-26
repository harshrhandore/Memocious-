# Staging password recovery

The reset form is `/reset-password`. Recovery verifies a one-time Supabase recovery token, updates the password and signs out the provider session globally. It does not create a customer or admin application session and does not remove MFA.

In Supabase Authentication → Email templates → Reset password, use this link (replace the origin when migrating):

```html
<a href="https://memocious-staging-v2.netlify.app/reset-password#token_hash={{ .TokenHash }}">Reset your password</a>
```

Using a fragment keeps the token out of HTTP request URLs and referrers. The form removes it from the address bar when submitted. Only recovery-type tokens are accepted. After a failed submission, request a new recovery email because the token may have been consumed.

Send a password-recovery email from the user's Supabase dashboard record to exercise this flow. SMTP delivery and actual provider token verification still require a hosted end-to-end check. Dashboard-generated legacy recovery URLs that redirect to the homepage are not supported by this form; update the template first. Do not disable MFA for password recovery.

Application session revocation after a password change still requires verification against the existing session validation/revocation policy; global provider sign-out alone does not instantly invalidate every previously issued access JWT.
