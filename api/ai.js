// Optional AI repurposing endpoint. OpenRouter is the preferred free-tier provider.
const ACTIONS = {
  summarize: 'Summarize this short-form video transcript in 3 concise bullet points. Return plain text only.',
  caption: 'Write 3 original social media captions based on this transcript. Keep them concise and separate them with blank lines. Return plain text only.',
  hooks: 'Write 5 original scroll-stopping hooks inspired by this transcript. Do not copy long phrases. Number them and return plain text only.'
};
function respond(res, status, body) { return res.status(status).json(body); }

async function callOpenRouter(transcript, instruction) {
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
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
    signal: AbortSignal.timeout(25000)
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error('OpenRouter provider error ' + upstream.status);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(transcript, instruction) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY);
  const upstream = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: transcript }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 700 } }), signal: AbortSignal.timeout(25000) });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error('Gemini provider error ' + upstream.status);
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

async function callOpenAI(transcript, instruction) {
  const base = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
  const upstream = await fetch(base + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.5, max_tokens: 700, messages: [{ role: 'system', content: instruction }, { role: 'user', content: transcript }] }), signal: AbortSignal.timeout(25000) });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error('OpenAI provider error ' + upstream.status);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { code: 'METHOD_NOT_ALLOWED', error: 'Use POST.' }); }
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return respond(res, 503, { code: 'AI_NOT_CONFIGURED', error: 'AI tools are not connected yet. Add OPENROUTER_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy.' });
  }
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!ACTIONS[action]) return respond(res, 400, { code: 'INVALID_ACTION', error: 'Choose summarize, caption, or hooks.' });
  if (!transcript || transcript.length > 12000) return respond(res, 400, { code: 'INVALID_TRANSCRIPT', error: 'Transcript is required and must be under 12,000 characters.' });
  try {
    let output;
    let provider;
    if (process.env.OPENROUTER_API_KEY) {
      output = await callOpenRouter(transcript, ACTIONS[action]);
      provider = 'openrouter';
    } else if (process.env.GEMINI_API_KEY) {
      output = await callGemini(transcript, ACTIONS[action]);
      provider = 'gemini';
    } else {
      output = await callOpenAI(transcript, ACTIONS[action]);
      provider = 'openai';
    }
    if (!output) return respond(res, 502, { code: 'AI_EMPTY_RESPONSE', error: 'The AI tool returned no text.' });
    return respond(res, 200, { action, output, provider });
  } catch (error) {
    console.error('AI request failed', error.message);
    const limited = /provider error (402|429|503)/.test(error.message);
    return respond(res, limited ? 429 : 502, { code: limited ? 'AI_RATE_LIMIT' : 'AI_SERVICE_ERROR', error: limited ? 'The free AI model is busy, unavailable, or its quota has been reached. Please try again later.' : 'The AI tool is temporarily unavailable. Please try again.' });
  }
};
