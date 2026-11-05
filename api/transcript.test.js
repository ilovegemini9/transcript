const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('./transcript');

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function invoke(body, options = {}) {
  const previousKey = process.env.SUPADATA_API_KEY;
  const previousFetch = global.fetch;
  if (options.apiKey === null) delete process.env.SUPADATA_API_KEY;
  else process.env.SUPADATA_API_KEY = options.apiKey || 'test-key';

  if (options.fetch) global.fetch = options.fetch;
  const req = { method: options.method || 'POST', body };
  const res = createResponse();

  try {
    await handler(req, res);
    return res;
  } finally {
    if (previousKey === undefined) delete process.env.SUPADATA_API_KEY;
    else process.env.SUPADATA_API_KEY = previousKey;
    global.fetch = previousFetch;
  }
}

function providerResponse(status, payload) {
  return async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.supadata\.ai\/v1\/transcript/);
    assert.equal(options.headers['x-api-key'], 'test-key');
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => payload
    };
  };
}

test('rejects methods other than POST', async () => {
  const res = await invoke({}, { method: 'GET' });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('returns a safe configuration error when the provider key is missing', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123' }, { apiKey: null });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'CONFIG_MISSING');
});

test('rejects unsupported platforms and unsafe URLs before calling the provider', async () => {
  for (const url of ['https://tiktok.com.evil.example/video/1', 'https://www.example.com/video/1', 'http://www.youtube.com/watch?v=demo', 'https://www.youtube.com.evil.example/watch?v=demo']) {
    const res = await invoke({ url }, { fetch: async () => { throw new Error('fetch must not run'); } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_URL');
  }
});

test('accepts supported public links from all four platforms', async () => {
  const urls = [
    'https://www.tiktok.com/@demo/video/123',
    'https://www.youtube.com/watch?v=demo',
    'https://youtu.be/demo',
    'https://www.facebook.com/watch/?v=123',
    'https://fb.watch/demo/',
    'https://www.instagram.com/reel/demo/'
  ];
  for (const url of urls) {
    const res = await invoke({ url }, { fetch: providerResponse(200, { content: 'Hello world', lang: 'en' }) });
    assert.equal(res.statusCode, 200, url);
  }
});

test('returns transcript text and language from the provider', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123' }, {
    fetch: providerResponse(200, { content: [{ text: 'Hello' }, { text: 'world' }], lang: 'en' })
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.transcript, 'Hello world');
  assert.equal(res.body.language, 'en');
});

test('passes an explicitly requested transcript language to Supadata', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123', lang: 'ar' }, {
    fetch: async (url, options) => {
      assert.equal(new URL(String(url)).searchParams.get('lang'), 'ar');
      assert.equal(new URL(String(url)).searchParams.get('mode'), 'auto');
      assert.equal(options.headers['x-api-key'], 'test-key');
      return { status: 200, ok: true, json: async () => ({ content: 'مرحبا', lang: 'ar' }) };
    }
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.transcript, 'مرحبا');
  assert.equal(res.body.language, 'ar');
});

test('passes each currently available site language preference to the provider', async () => {
  const languages = ['en', 'fr', 'es', 'ar', 'pt', 'de', 'it'];
  for (const lang of languages) {
    const res = await invoke({ url: 'https://www.youtube.com/watch?v=demo', lang }, {
      fetch: async (url) => {
        assert.equal(new URL(String(url)).searchParams.get('lang'), lang);
        return { status: 200, ok: true, json: async () => ({ content: 'sample transcript', lang }) };
      }
    });
    assert.equal(res.statusCode, 200, lang);
    assert.equal(res.body.language, lang, lang);
  }
});

test('rejects malformed transcript language preferences', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123', lang: 'arabic<script>' }, {
    fetch: async () => { throw new Error('fetch must not run'); }
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'INVALID_LANGUAGE');
});

test('returns a validated async job for polling', async () => {
  const res = await invoke({ url: 'https://vm.tiktok.com/example/' }, {
    fetch: providerResponse(202, { status: 'processing', jobId: 'job_12345' })
  });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { status: 'processing', jobId: 'job_12345' });
});

test('does not expose provider authorization failures as video privacy errors', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123' }, {
    fetch: providerResponse(401, { message: 'secret provider detail' })
  });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'PROVIDER_AUTH_ERROR');
  assert.doesNotMatch(res.body.error, /secret provider detail/);
});

test('explains when the source video is inaccessible', async () => {
  const res = await invoke({ url: 'https://www.youtube.com/watch?v=restricted' }, {
    fetch: providerResponse(403, { error: 'forbidden' })
  });
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'VIDEO_INACCESSIBLE');
});

test('returns a useful error when no transcript is available', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123' }, {
    fetch: providerResponse(206, { error: 'transcript-unavailable' })
  });
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'TRANSCRIPT_UNAVAILABLE');
});

test('maps provider rate limits to a safe retryable response', async () => {
  const res = await invoke({ url: 'https://www.youtube.com/watch?v=demo' }, {
    fetch: providerResponse(429, { message: 'provider internal detail' })
  });
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 'RATE_LIMITED');
  assert.doesNotMatch(res.body.error, /provider internal detail/);
});

test('maps provider timeouts to a gateway timeout response', async () => {
  const res = await invoke({ url: 'https://www.youtube.com/watch?v=demo' }, {
    fetch: async () => { throw Object.assign(new Error('upstream timed out'), { name: 'TimeoutError' }); }
  });
  assert.equal(res.statusCode, 504);
  assert.equal(res.body.code, 'PROVIDER_TIMEOUT');
  assert.doesNotMatch(res.body.error, /upstream timed out/);
});

test('rejects a provider success response that contains no usable transcript', async () => {
  const res = await invoke({ url: 'https://www.youtube.com/watch?v=demo' }, {
    fetch: providerResponse(200, { content: [{ text: 42 }, null, {}], lang: 'en' })
  });
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'TRANSCRIPT_UNAVAILABLE');
});


test('returns timestamped segments when the provider supplies valid timing data', async () => {
  const res = await invoke({ url: 'https://www.tiktok.com/@demo/video/123', lang: 'en' }, {
    fetch: async (url) => {
      assert.equal(new URL(String(url)).searchParams.has('text'), false);
      return {
        status: 200,
        ok: true,
        json: async () => ({
          content: [
            { text: 'Hello', offset: 0, duration: 1200 },
            { text: 'world', offset: 1200, duration: 900 },
            { text: 'bad timing', offset: -1, duration: 0 },
            { text: 'missing timing' }
          ],
          lang: 'en'
        })
      };
    }
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.transcript, 'Hello world bad timing missing timing');
  assert.deepEqual(res.body.segments, [
    { text: 'Hello', offset: 0, duration: 1200 },
    { text: 'world', offset: 1200, duration: 900 }
  ]);
  assert.equal(res.body.source, null);
});

test('returns no timestamp segments for plain-text provider responses', async () => {
  const res = await invoke({ url: 'https://www.youtube.com/watch?v=demo' }, {
    fetch: providerResponse(200, { content: 'Plain transcript only', lang: 'en' })
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.segments, []);
  assert.equal(res.body.source, null);
});

test('rejects malformed job identifiers before contacting the provider', async () => {
  const res = await invoke({ jobId: '../private' }, {
    fetch: async () => { throw new Error('fetch must not run'); }
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'INVALID_JOB');
});
