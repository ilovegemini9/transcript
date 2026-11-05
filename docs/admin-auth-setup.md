# Admin sign-in setup

The admin preview uses a signed, eight-hour, HttpOnly session cookie. It does not require a database.

## Required environment variables

Configure these in the Vercel project settings for the deployment environment:

- `ADMIN_PASSWORD`: the admin password. The requested value `111111` is accepted by the code, but it is weak and must only be used for a temporary private preview. Use a unique password of at least 16 characters before production.
- `ADMIN_SESSION_SECRET`: a random secret of at least 32 characters. Generate one with `openssl rand -base64 48`. Never commit it to Git.

Redeploy after adding or changing the variables. Until both values are configured, sign-in intentionally returns `ADMIN_AUTH_NOT_CONFIGURED`.

## Important security limits

- The sign-in endpoint is `/api/admin-login`; sessions are HttpOnly, Secure, SameSite=Strict, and expire after eight hours.
- No database is used.
- The current dashboard is still a static preview with placeholder metrics and no privileged data-changing actions. The static HTML itself is not a security boundary.
- Every future admin API must call `hasAdminSession(req)` from `api/_lib/admin-session.js` before returning private data or performing an action.
- Login-attempt throttling with a shared store is not implemented yet. Do not expose this preview publicly with the six-digit password. Add shared rate limiting before production.
