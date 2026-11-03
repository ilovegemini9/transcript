const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./ai');
function response() { return { statusCode: 200, body: null, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} }; }
async function invoke(body, key) { const previous=process.env.OPENAI_API_KEY; if(key===null) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=key||'test'; const res=response(); try { await handler({method:'POST',body},res); return res; } finally { if(previous===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=previous; } }
test('AI endpoint returns safe config error when disabled', async()=>{ const res=await invoke({action:'summarize',transcript:'hello'},null); assert.equal(res.statusCode,503); assert.equal(res.body.code,'AI_NOT_CONFIGURED'); });
test('AI endpoint validates action before provider call', async()=>{ const res=await invoke({action:'unknown',transcript:'hello'},'test'); assert.equal(res.statusCode,400); assert.equal(res.body.code,'INVALID_ACTION'); });
test('AI endpoint rejects oversized transcript', async()=>{ const res=await invoke({action:'hooks',transcript:'x'.repeat(12001)},'test'); assert.equal(res.statusCode,400); assert.equal(res.body.code,'INVALID_TRANSCRIPT'); });
