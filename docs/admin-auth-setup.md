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
- Login-attempt throttling uses Upstash Redis when configured: five attempts per 15 minutes per trusted Vercel edge IP. Without the Upstash variables, throttling is disabled. Do not expose the preview publicly with the six-digit password.

## Shared API rate limits

Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel to activate shared serverless rate limiting.

- New transcript jobs: 10 requests per 60 seconds per trusted edge IP.
- Transcript job polling: 50 requests per 60 seconds per trusted edge IP, kept separate so the browser's 1.5-second polling interval is not blocked by the new-job limit.
- AI generation: 5 requests per 60 seconds per trusted edge IP.
- Admin login: 5 attempts per 900 seconds per trusted edge IP.

Optional overrides: `TRANSCRIPT_RATE_LIMIT`, `TRANSCRIPT_POLL_RATE_LIMIT`, `AI_RATE_LIMIT`, and `ADMIN_LOGIN_RATE_LIMIT`.

The limiter uses Vercel's `x-real-ip` header and deliberately ignores the client-controlled left-most `x-forwarded-for` value. If the Upstash variables are absent, limits are not active. If configured storage is unavailable, protected endpoints return HTTP 503 rather than bypassing the limit.
