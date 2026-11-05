const { COOKIE_NAME, SESSION_SECONDS, getConfig, safeEqual, createSession, hasAdminSession } = require('./_lib/admin-session');
const { enforceRateLimit } = require('./_lib/rate-limit');

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const config = getConfig();
  if (!config) return send(res, 503, { ok: false, error: 'ADMIN_AUTH_NOT_CONFIGURED' });

  if (req.method === 'GET') {
    return send(res, 200, { ok: hasAdminSession(req) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const action = body && body.action;

  if (action === 'logout') {
    return send(res, 200, { ok: true }, {
      'Set-Cookie': COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    });
  }

  if (action !== 'login' || typeof body.password !== 'string') {
    return send(res, 400, { ok: false, error: 'INVALID_REQUEST' });
  }
  // Login attempts share a durable per-IP window across serverless instances.
  // The login endpoint stays available locally when Upstash is not configured.
  if (!await enforceRateLimit(req, res, 'adminLogin', { limit: 5, windowSeconds: 900 })) return;
  if (!safeEqual(body.password, config.password)) {
    return send(res, 401, { ok: false, error: 'INVALID_CREDENTIALS' });
  }

  const token = createSession(config.secret);
  return send(res, 200, { ok: true }, {
    'Set-Cookie': COOKIE_NAME + '=' + encodeURIComponent(token) + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + SESSION_SECONDS
  });
};
