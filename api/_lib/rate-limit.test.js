const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRateLimit, enforceRateLimit } = require('./rate-limit');

function response() {
  return { headers: {}, statusCode: 200, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
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

test('rate limiting is explicitly unconfigured when shared credentials are absent', async () => {
  await withEnv({ UPSTASH_REDIS_REST_URL: null, UPSTASH_REDIS_REST_TOKEN: null }, async () => {
    const result = await checkRateLimit({ headers: {} }, 'transcript');
    assert.equal(result.configured, false);
    assert.equal(result.allowed, true);
  });
});

test('uses an atomic Redis script and rejects requests over the configured limit', async () => {
  await withEnv({ UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-token' }, async () => {
    const previousFetch = global.fetch;
    let command;
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://redis.example');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      command = JSON.parse(options.body);
      return { ok: true, json: async () => ({ result: [6, 42] }) };
    };
    try {
      const result = await checkRateLimit({ headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.1' } }, 'ai', { limit: 5 });
      assert.equal(command[0], 'EVAL');
      assert.equal(command[2], '1');
      assert.match(command[3], /^transcript:rl:ai:[a-f0-9]{64}$/);
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
      assert.equal(result.retryAfter, 42);
    } finally { global.fetch = previousFetch; }
  });
});

test('fails closed and returns 503 if configured shared storage is unavailable', async () => {
  await withEnv({ UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-token' }, async () => {
    const previousFetch = global.fetch;
    global.fetch = async () => { throw new Error('private connection detail'); };
    const res = response();
    try {
      const allowed = await enforceRateLimit({ headers: {} }, res, 'transcript');
      assert.equal(allowed, false);
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.code, 'RATE_LIMIT_UNAVAILABLE');
      assert.doesNotMatch(res.body.error, /private connection detail/);
    } finally { global.fetch = previousFetch; }
  });
});

test('does not trust spoofable X-Forwarded-For for client identity', async () => {
  await withEnv({ UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-token' }, async () => {
    const previousFetch = global.fetch;
    const keys = [];
    global.fetch = async (_url, options) => {
      keys.push(JSON.parse(options.body)[3]);
      return { ok: true, json: async () => ({ result: [1, 59] }) };
    };
    try {
      await checkRateLimit({ headers: { 'x-forwarded-for': '198.51.100.10' } }, 'transcript');
      await checkRateLimit({ headers: { 'x-forwarded-for': '203.0.113.20' } }, 'transcript');
      assert.equal(keys[0], keys[1], 'untrusted forwarded headers must not let clients rotate their bucket');
    } finally { global.fetch = previousFetch; }
  });
});

test('uses the trusted edge client address when available', async () => {
  await withEnv({ UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-token' }, async () => {
    const previousFetch = global.fetch;
    let key;
    global.fetch = async (_url, options) => {
      key = JSON.parse(options.body)[3];
      return { ok: true, json: async () => ({ result: [1, 59] }) };
    };
    try {
      await checkRateLimit({ headers: { 'x-real-ip': '198.51.100.10', 'x-forwarded-for': '203.0.113.20' } }, 'transcript');
      assert.match(key, /^transcript:rl:transcript:[a-f0-9]{64}$/);
    } finally { global.fetch = previousFetch; }
  });
});
