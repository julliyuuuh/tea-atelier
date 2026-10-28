# Authentication protection

Run `lib/db/migrations/20261028_auth_rate_limits.sql` in the application's database
**before deploying** the updated routes. Use the application's database role (or
grant that role SELECT, INSERT, UPDATE and DELETE on the new table). It adds one
table and an expiry index; it does not modify users, passwords, orders or payments.
The migration is safe to run again.

Counters live in PostgreSQL, so all instances using the same database and
JWT_SECRET share limits across restarts. No Redis account or new dependency is
required. Missing JWT_SECRET, missing migration or an unavailable counter store
returns 503 rather than allowing unthrottled authentication. Existing signed-in
sessions and checkout endpoints do not use this limiter.

## Limits

Every window is 15 minutes, starting at the first request:

| Endpoint                                            | Account/identifier submissions | Per verified client IP |
| --------------------------------------------------- | -----------------------------: | ---------------------: |
| Password login (customer and admin, including TOTP) |                             15 |                     60 |
| Google login                                        |                             30 |                     60 |
| Forgot password                                     |                              3 |                     10 |
| Signup                                              |                              3 |                     10 |
| Reset password                                      |             10 per reset token |                     30 |
| Resend verification                                 |       3 per authenticated user |                     10 |

All submissions count, including successful ones. Do not clear counters on a
successful password check: that would let a known password bypass the TOTP limit.
Blocked requests do not extend the window. Limits apply to nonexistent accounts
too. Responses use HTTP 429, a Retry-After header, and a retry message already
displayed by the forms. Passwords are never trimmed or rewritten.

Keys are HMAC-SHA256 digests using JWT_SECRET; raw emails, IPs and reset tokens are
not stored in the counter table. Rotating JWT_SECRET also starts new buckets and
invalidates existing sessions, so do not rotate it just to clear a limit. A small
bounded cleanup periodically removes counters expired more than a day ago;
cleanup resumes when requests resume.

## Trusted ingress and IP limits

Account limits work immediately without extra environment variables. By default,
all clients share a generous ceiling of **300 requests per endpoint per 15
minutes** in addition to the individual account limits. This avoids trusting
attacker-supplied X-Forwarded-For or CF-Connecting-IP values. This shared ceiling
can affect everyone on that endpoint when exhausted, so configure verified IP
handling before higher-traffic use.

To enable the per-client column above, set the server-only Config variable
`AUTH_TRUSTED_IP_HEADER` to a **single-IP header that your hosting ingress is
documented and verified to overwrite**. Verify this separately on Railway and
Vercel, including direct provider URLs that bypass Cloudflare. Never merely trust
a Cloudflare header on a publicly reachable Railway origin. Do not select a
comma-separated forwarding chain: invalid or missing IPs fall back to the shared
ceiling. Do not enable a header without verifying it at that deployment.

This application layer limits credential guessing and email abuse. Edge traffic
controls are still useful against floods that reach the app/database itself.

## Other login hardening

- Missing accounts and accounts created using Google still do bcrypt work and
  receive the same invalid-credentials response as incorrect passwords.
- Invalid JSON, wrong field types, oversized login passwords/Google credentials,
  and malformed TOTP codes are rejected rather than passed to auth libraries.
- Login's `redirect` query parameter accepts only local paths, preventing an
  arbitrary external redirect after sign-in.
- Password, suspended-account, Google verification and existing TOTP checks are
  retained. This change does not replace the current JWT/localStorage session
  design or change payment handlers.

## Deployment and checks

1. Run the SQL migration in Railway's application database.
2. Copy the delivered application files into the original repository and deploy
   through the normal Git push. No payment environment variable changes.
3. Check customer/admin login, Google login, and forgot password. Use a throwaway
   account when testing the 16th login submission: it returns 429 until expiry.
4. For Vercel later, migrate its actual Neon target branch **and update its
   separate cloned repository** before redeploying. Migrating only Railway does
   not migrate Neon. Keep its protection/webhook settings as previously agreed.

Rollback: revert the delivered application changes and redeploy. The unused
counter table can remain. Do not drop it while a deployment still uses it.

Tests: `tests/auth-rate-limit.test.mjs` exercises actual PostgreSQL SQL via
PGlite, including simultaneous requests, shared state, expiry, spoofed headers,
fail-closed behavior, route integration and normal login/TOTP behavior.
`tests/ui-api-contracts.test.mjs` applies the new migration to its auth fixture;
the password-policy fixture stubs throttling so its original policy checks stay
focused on validation and hashing.
