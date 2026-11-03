// Vercel serverless function: the provider API key stays on the server.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Use POST.' });
  }

  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ code: 'CONFIG_MISSING', error: 'Add SUPADATA_API_KEY in Vercel Environment Variables.' });
  }

  const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId.trim() : '';
  const videoUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  let endpoint;

  if (jobId) {
    if (!/^[a-zA-Z0-9_-]{5,128}$/.test(jobId)) {
      return res.status(400).json({ code: 'INVALID_JOB', error: 'Invalid transcript job.' });
    }
    endpoint = new URL('https://api.supadata.ai/v1/transcript/' + encodeURIComponent(jobId));
  } else {
    let parsed;
    try { parsed = new URL(videoUrl); }
    catch { return res.status(400).json({ code: 'INVALID_URL', error: 'Please provide a valid TikTok URL.' }); }

    if (parsed.protocol !== 'https:' || !/(^|[.])tiktok[.]com$/i.test(parsed.hostname)) {
      return res.status(400).json({ code: 'INVALID_URL', error: 'Only public HTTPS TikTok links are supported.' });
    }

    endpoint = new URL('https://api.supadata.ai/v1/transcript');
    endpoint.searchParams.set('url', videoUrl);
    endpoint.searchParams.set('text', 'true');
    // Native mode reads existing captions only; it avoids paid AI transcription fallback.
    endpoint.searchParams.set('mode', 'native');
  }

  try {
    const upstream = await fetch(endpoint, {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }
    });
    const payload = await upstream.json().catch(() => ({}));

    if (upstream.status === 202 || payload.status === 'processing' || payload.jobId) {
      return res.status(202).json({ status: 'processing', jobId: payload.jobId || jobId });
    }
    if (upstream.status === 206 || payload.error === 'transcript-unavailable') {
      return res.status(422).json({ code: 'TRANSCRIPT_UNAVAILABLE', error: 'No captions are available for this video.' });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(422).json({ code: 'PRIVATE_OR_RESTRICTED', error: 'The video is private or restricted.' });
    }
    if (upstream.status === 429) {
      return res.status(429).json({ code: 'RATE_LIMITED', error: 'The transcript API free limit has been reached.' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ code: 'UPSTREAM_ERROR', error: payload.message || 'The transcript provider could not process this video.' });
    }

    const transcript = typeof payload.content === 'string'
      ? payload.content
      : Array.isArray(payload.content)
        ? payload.content.map(part => part && typeof part.text === 'string' ? part.text : '').filter(Boolean).join(' ')
        : '';
    if (!transcript.trim()) {
      return res.status(422).json({ code: 'TRANSCRIPT_UNAVAILABLE', error: 'No transcript text was returned.' });
    }
    return res.status(200).json({ transcript: transcript.trim(), language: payload.lang || null });
  } catch (error) {
    console.error('ClipText transcript error:', error);
    return res.status(502).json({ code: 'SERVICE_ERROR', error: 'Transcript service is temporarily unavailable. Please try again.' });
  }
};
