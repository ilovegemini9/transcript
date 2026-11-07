const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./admin-login');

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    end(value) { this.body = JSON.parse(value); }
  };
}

async function withEnv(values, run) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === null) delete process.env[key];
    else process.env[key] = value;
  }
  try { return await run(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function invoke(method, body, cookie) {
  const req = { method, body, headers: { cookie: cookie || '' } };
  const res = response();
  await handler(req, res);
  return res;
}

test('admin auth fails safely when server secrets are missing', async () => {
  await withEnv({ ADMIN_PASSWORD: null, ADMIN_SESSION_SECRET: null }, async () => {
    const res = await invoke('GET');
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'ADMIN_AUTH_NOT_CONFIGURED');
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });
});

test('admin login issues an HttpOnly secure same-site session cookie', async () => {
  await withEnv({
    ADMIN_PASSWORD: 'test-only-password',
    ADMIN_SESSION_SECRET: 'test-secret-with-at-least-32-characters',
    UPSTASH_REDIS_REST_URL: null,
    UPSTASH_REDIS_REST_TOKEN: null
  }, async () => {
    const res = await invoke('POST', { action: 'login', password: 'test-only-password' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.match(res.headers['Set-Cookie'], /HttpOnly/);
    assert.match(res.headers['Set-Cookie'], /Secure/);
    assert.match(res.headers['Set-Cookie'], /SameSite=Strict/);
    assert.match(res.headers['Set-Cookie'], /Max-Age=28800/);
    const cookie = res.headers['Set-Cookie'].split(';')[0];
    const check = await invoke('GET', undefined, cookie);
    assert.equal(check.body.ok, true);
  });
});

test('admin login rejects wrong passwords and logout expires the session cookie', async () => {
  await withEnv({
    ADMIN_PASSWORD: 'test-only-password',
    ADMIN_SESSION_SECRET: 'test-secret-with-at-least-32-characters',
    UPSTASH_REDIS_REST_URL: null,
    UPSTASH_REDIS_REST_TOKEN: null
  }, async () => {
    const rejected = await invoke('POST', { action: 'login', password: 'wrong-password' });
    assert.equal(rejected.statusCode, 401);
    assert.equal(rejected.body.error, 'INVALID_CREDENTIALS');
    const logout = await invoke('POST', { action: 'logout' });
    assert.equal(logout.statusCode, 200);
    assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
  });
});
