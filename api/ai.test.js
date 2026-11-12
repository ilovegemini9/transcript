const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./ai');
function response() { return { statusCode: 200, body: null, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} }; }
async function invoke(body, keys = {}, fetchImpl) {
  const names = ['OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const previousFetch = global.fetch;
  for (const name of names) {
    if (keys[name] === null) delete process.env[name];
    else if (keys[name]) process.env[name] = keys[name];
    else delete process.env[name];
  }
  if (fetchImpl) global.fetch = fetchImpl;
  const res = response();
  try { await handler({ method: 'POST', body }, res); return res; }
  finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    global.fetch = previousFetch;
  }
}
test('AI endpoint returns safe config error when disabled', async()=>{ const res=await invoke({action:'summarize',transcript:'hello'}, {OPENAI_API_KEY:null,OPENROUTER_API_KEY:null,GEMINI_API_KEY:null}); assert.equal(res.statusCode,503); assert.equal(res.body.code,'AI_NOT_CONFIGURED'); });
test('AI endpoint validates action before provider call', async()=>{ const res=await invoke({action:'unknown',transcript:'hello'}, {OPENAI_API_KEY:'test'}); assert.equal(res.statusCode,400); assert.equal(res.body.code,'INVALID_ACTION'); });
test('AI endpoint rejects oversized transcript', async()=>{ const res=await invoke({action:'hooks',transcript:'x'.repeat(12001)}, {OPENAI_API_KEY:'test'}); assert.equal(res.statusCode,400); assert.equal(res.body.code,'INVALID_TRANSCRIPT'); });


test('AI endpoint stops provider fallback on a provider timeout', async () => {
  let calls = 0;
  const timeoutFetch = async () => {
    calls += 1;
    const error = new Error('timed out');
    error.name = 'TimeoutError';
    throw error;
  };
  const res = await invoke(
    { action: 'summarize', transcript: 'hello' },
    { OPENROUTER_API_KEY: 'router-test', GEMINI_API_KEY: 'gemini-test', OPENAI_API_KEY: 'openai-test' },
    timeoutFetch
  );
  assert.equal(res.statusCode, 504);
  assert.equal(res.body.code, 'AI_TIMEOUT');
  assert.equal(calls, 1);
});
