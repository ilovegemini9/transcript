// Optional AI repurposing endpoint. Set OPENAI_API_KEY in Vercel to enable it.
const ACTIONS = {
  summarize: 'Summarize this short-form video transcript in 3 concise bullet points. Return plain text only.',
  caption: 'Write 3 social media captions based on this transcript. Keep them original, concise, and separated by blank lines. Return plain text only.',
  hooks: 'Write 5 scroll-stopping hooks inspired by this transcript. Do not copy long phrases. Number them and return plain text only.'
};
function respond(res, status, body) { return res.status(status).json(body); }
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { code: 'METHOD_NOT_ALLOWED', error: 'Use POST.' }); }
  if (!process.env.OPENAI_API_KEY) return respond(res, 503, { code: 'AI_NOT_CONFIGURED', error: 'AI tools are not configured yet. Add OPENAI_API_KEY to enable them.' });
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!ACTIONS[action]) return respond(res, 400, { code: 'INVALID_ACTION', error: 'Choose summarize, caption, or hooks.' });
  if (!transcript || transcript.length > 12000) return respond(res, 400, { code: 'INVALID_TRANSCRIPT', error: 'Transcript is required and must be under 12,000 characters.' });
  const base = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  try {
    const upstream = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.5, max_tokens: 700, messages: [{ role: 'system', content: ACTIONS[action] }, { role: 'user', content: transcript }] }),
      signal: AbortSignal.timeout(25000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { console.error('AI provider error', upstream.status); return respond(res, 502, { code: 'AI_PROVIDER_ERROR', error: 'The AI tool could not complete this request.' }); }
    const output = data.choices?.[0]?.message?.content?.trim();
    if (!output) return respond(res, 502, { code: 'AI_EMPTY_RESPONSE', error: 'The AI tool returned no text.' });
    return respond(res, 200, { action, output });
  } catch (error) {
    console.error('AI request failed', error);
    return respond(res, 502, { code: 'AI_SERVICE_ERROR', error: 'The AI tool is temporarily unavailable.' });
  }
};
