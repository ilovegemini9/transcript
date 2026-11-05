const { createHash } = require('node:crypto');

const WINDOW_SECONDS = 60;
const LIMITS = {
  transcript: Number(process.env.TRANSCRIPT_RATE_LIMIT || 10),
  ai: Number(process.env.AI_RATE_LIMIT || 5),
  adminLogin: Number(process.env.ADMIN_LOGIN_RATE_LIMIT || 5)
};

const SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  "return {count, ttl}"
].join('\n');

function getClientAddress(req) {
  // Vercel supplies x-real-ip from its trusted edge. Do not trust the client-controlled
  // left-most x-forwarded-for value: attackers can spoof it to evade per-IP limits.
  const raw = req.headers?.['x-real-ip'] || '';
  const address = String(raw).trim().slice(0, 128);
  return address || 'unknown';
}

async function checkRateLimit(req, scope, options = {}) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { configured: false, allowed: true, remaining: null, retryAfter: null };

  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : (LIMITS[scope] || 10);
  const windowSeconds = Number.isInteger(options.windowSeconds) && options.windowSeconds > 0
    ? options.windowSeconds
    : WINDOW_SECONDS;
  const identity = createHash('sha256').update(getClientAddress(req)).digest('hex');
  const key = 'transcript:rl:' + scope + ':' + identity;

  let response;
  try {
    response = await fetch(url.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['EVAL', SCRIPT, '1', key, String(windowSeconds)]),
      signal: AbortSignal.timeout(2500)
    });
  } catch (error) {
    const failure = new Error('Shared rate-limit store unavailable');
    failure.code = 'RATE_LIMIT_STORE_UNAVAILABLE';
    throw failure;
  }

  if (!response.ok) {
    const failure = new Error('Shared rate-limit store rejected the request');
    failure.code = 'RATE_LIMIT_STORE_UNAVAILABLE';
    throw failure;
  }

  const payload = await response.json().catch(() => null);
  const values = payload?.result;
  if (!Array.isArray(values) || !Number.isFinite(Number(values[0]))) {
    const failure = new Error('Shared rate-limit store returned an invalid response');
    failure.code = 'RATE_LIMIT_STORE_UNAVAILABLE';
    throw failure;
  }

  const count = Number(values[0]);
  const retryAfter = Math.max(1, Number(values[1]) || windowSeconds);
  return {
    configured: true,
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter
  };
}

async function enforceRateLimit(req, res, scope, options = {}) {
  let result;
  try {
    result = await checkRateLimit(req, scope, options);
  } catch {
    // Fail closed once a shared store has been configured; never silently bypass it.
    res.setHeader('Retry-After', '30');
    res.status(503).json({
      code: 'RATE_LIMIT_UNAVAILABLE',
      error: 'This service is temporarily unavailable. Please try again shortly.'
    });
    return false;
  }

  if (!result.configured) return true;
  res.setHeader('RateLimit-Limit', String(options.limit || LIMITS[scope] || 10));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.status(429).json({
      code: 'RATE_LIMITED',
      error: 'Too many requests. Please wait a moment and try again.'
    });
    return false;
  }
  return true;
}

module.exports = { checkRateLimit, enforceRateLimit, getClientAddress };
