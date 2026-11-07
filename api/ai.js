// Optional AI repurposing endpoint. OpenRouter free models with ordered free-only fallbacks.
const { enforceRateLimit } = require('./_lib/rate-limit');

const ACTIONS = {
  summarize: 'Summarize this short-form video transcript in 3 concise bullet points. Preserve the transcript language. Return plain text only.',
  caption: 'Write 3 original social media captions based on this transcript. Keep them concise, preserve the transcript language, and separate them with blank lines. Return plain text only.',
  hooks: 'Write 5 original scroll-stopping hooks inspired by this transcript. Preserve the transcript language. Do not copy long phrases. Number them and return plain text only.'
};

// Keep every entry on the :free tier so fallback routing cannot select a paid model.
const FREE_MODELS = [
  'google/gemma-4-31b:free',
  'google/gemma-4-26b-a4b:free',
  'nvidia/nemotron-3-nano-omni:free',
  'xingchen-agi/xing4.0-29b-a4b:free'
];

function respond(res, status, body) { return res.status(status).json(body); }

async function callOpenRouter(transcript, instruction) {
  // Prefer OpenRouter's free-model router so model availability can change without a code update.
  // If it is unavailable, retry with the explicitly free, ordered model list below.
  const preferred = process.env.OPENROUTER_MODEL;
  const models = preferred && preferred.endsWith(':free')
    ? [preferred, ...FREE_MODELS.filter(model => model !== preferred)]
    : FREE_MODELS;
  const attempts = ['openrouter/free', ...models];
  let lastStatus = 0;

  for (const model of attempts) {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transcriptiktok.vercel.app',
        'X-Title': 'Transcript TikTok'
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 700,
        messages: [
          { role: 'system', content: instruction },
          { role: 'user', content: transcript }
        ]
      }),
      signal: AbortSignal.timeout(18000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (upstream.ok) {
      const output = data.choices?.[0]?.message?.content?.trim() || '';
      if (output) return { output, model: data.model || model };
      lastStatus = 502;
      continue;
    }

    lastStatus = upstream.status;
    // Authentication and quota errors affect the whole account; trying other models won't help.
    if ([401, 402, 403].includes(upstream.status)) break;
  }

  const error = new Error('OpenRouter provider error ' + lastStatus);
  error.status = lastStatus;
  throw error;
}

async function callGemini(transcript, instruction) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const upstream = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: transcript }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 700 } }), signal: AbortSignal.timeout(25000) });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) { const error = new Error('Gemini provider error ' + upstream.status); error.status = upstream.status; throw error; }
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

async function callOpenAI(transcript, instruction) {
  const base = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
  const upstream = await fetch(base + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.5, max_tokens: 700, messages: [{ role: 'system', content: instruction }, { role: 'user', content: transcript }] }), signal: AbortSignal.timeout(25000) });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) { const error = new Error('OpenAI provider error ' + upstream.status); error.status = upstream.status; throw error; }
  return data.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { code: 'METHOD_NOT_ALLOWED', error: 'Use POST.' }); }
  if (!(await enforceRateLimit(req, res, 'ai', { limit: 5 }))) return;
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return respond(res, 503, { code: 'AI_NOT_CONFIGURED', error: 'AI tools are not connected yet. Add OPENROUTER_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy.' });
  }
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!ACTIONS[action]) return respond(res, 400, { code: 'INVALID_ACTION', error: 'Choose summarize, caption, or hooks.' });
  if (!transcript || transcript.length > 12000) return respond(res, 400, { code: 'INVALID_TRANSCRIPT', error: 'Transcript is required and must be under 12,000 characters.' });
  try {
    let output = '';
    let provider = '';
    let usedModel = null;
    let lastError = null;
    // Try independent providers in order; Gemini is the backup for exhausted OpenRouter free quota.
    const providers = [];
    if (process.env.OPENROUTER_API_KEY) providers.push(['openrouter', async () => {
      const result = await callOpenRouter(transcript, ACTIONS[action]);
      usedModel = result.model;
      return result.output;
    }]);
    if (process.env.GEMINI_API_KEY) providers.push(['gemini', () => callGemini(transcript, ACTIONS[action])]);
    if (process.env.OPENAI_API_KEY) providers.push(['openai', () => callOpenAI(transcript, ACTIONS[action])]);

    for (const [name, run] of providers) {
      try {
        const candidate = await run();
        if (candidate) { output = candidate; provider = name; break; }
        lastError = new Error(name + ' provider error 502');
        lastError.status = 502;
      } catch (providerError) {
        lastError = providerError;
        console.error('AI provider failed:', name, providerError.message);
      }
    }

    if (!output) throw (lastError || new Error('No AI provider is configured.'));
    const usedProviderModel = provider === 'openrouter' ? usedModel : (provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-3.8-flash') : (process.env.OPENAI_MODEL || 'gpt-4o-mini'));
    return respond(res, 200, { action, output, provider, model: usedProviderModel });
  } catch (error) {
    console.error('AI request failed', error.message);
    const status = Number(error.status) || Number(error.message.match(/provider error (\d+)/)?.[1]) || 0;
    if ([402, 429].includes(status)) {
      return respond(res, 429, { code: 'AI_RATE_LIMIT', error: 'The free AI quota or rate limit has been reached. Please try again later.' });
    }
    if ([401, 403].includes(status)) {
      return respond(res, 503, { code: 'AI_AUTH_ERROR', error: 'The AI provider rejected its server configuration. Please contact the site owner.' });
    }
    if (status === 502 || status === 503 || status === 504) {
      return respond(res, 503, { code: 'AI_MODEL_UNAVAILABLE', error: 'Free AI models are temporarily unavailable. Please try again in a moment.' });
    }
    return respond(res, 502, { code: 'AI_SERVICE_ERROR', error: 'The AI service could not complete this request. Please try again.' });
  }
};
