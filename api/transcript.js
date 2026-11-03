// Vercel serverless function. Keep provider credentials on the server.
const PROVIDER_TIMEOUT_MS = 20000;
const SUPPORTED_HOSTS = [
  { platform: 'TikTok', test: /(^|\.)tiktok\.com$/i },
  { platform: 'YouTube', test: /(^|\.)(youtube\.com|youtu\.be)$/i },
  { platform: 'Facebook', test: /(^|\.)(facebook\.com|fb\.watch)$/i },
  { platform: 'Instagram', test: /(^|\.)instagram\.com$/i }
];
const JOB_ID = /^[a-zA-Z0-9_-]{5,128}$/;

function jsonError(res, status, code, error) {
  return res.status(status).json({ code, error });
}

function getPlatform(hostname) {
  return SUPPORTED_HOSTS.find((entry) => entry.test.test(hostname))?.platform || null;
}

function getTranscript(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      return part && typeof part.text === 'string' ? part.text : '';
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');
  }

  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return jsonError(res, 503, 'CONFIG_MISSING', 'Transcript service is not configured. Please try again later.');
  }

  const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId.trim() : '';
  const videoUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  let endpoint;
  let platform = null;

  if (jobId) {
    if (!JOB_ID.test(jobId)) {
      return jsonError(res, 400, 'INVALID_JOB', 'Invalid transcript job.');
    }
    endpoint = new URL('https://api.supadata.ai/v1/transcript/' + encodeURIComponent(jobId));
  } else {
    if (!videoUrl || videoUrl.length > 2048) {
      return jsonError(res, 400, 'INVALID_URL', 'Please provide a valid supported video URL.');
    }

    let parsed;
    try {
      parsed = new URL(videoUrl);
    } catch {
      return jsonError(res, 400, 'INVALID_URL', 'Please provide a valid supported video URL.');
    }

    if (
      parsed.protocol !== 'https:' ||
      !(platform = getPlatform(parsed.hostname)) ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return jsonError(res, 400, 'INVALID_URL', 'Only public HTTPS TikTok, YouTube, Facebook, and Instagram links are supported.');
    }

    endpoint = new URL('https://api.supadata.ai/v1/transcript');
    endpoint.searchParams.set('url', parsed.toString());
    endpoint.searchParams.set('text', 'true');
    // Auto mode prefers native captions and can use speech recognition when supported.
    endpoint.searchParams.set('mode', 'auto');
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
    });

    const payload = await upstream.json().catch(() => ({}));

    if (upstream.status === 202 || payload.status === 'processing') {
      const nextJobId = typeof payload.jobId === 'string' ? payload.jobId : jobId;
      if (!nextJobId || !JOB_ID.test(nextJobId)) {
        return jsonError(res, 502, 'INVALID_PROVIDER_RESPONSE', 'The transcript provider returned an invalid processing job.');
      }
      return res.status(202).json({ status: 'processing', jobId: nextJobId });
    }

    if (upstream.status === 206 || payload.error === 'transcript-unavailable') {
      return jsonError(res, 422, 'TRANSCRIPT_UNAVAILABLE', 'No transcript could be generated for this video. Try another public TikTok video with clear speech.');
    }

    if (upstream.status === 401 || upstream.status === 403) {
      console.error('Transcript TikTok provider authorization failed:', upstream.status);
      return jsonError(res, 503, 'PROVIDER_AUTH_ERROR', 'The transcript service is temporarily unavailable. Please try again later.');
    }

    if (upstream.status === 429) {
      return jsonError(res, 429, 'RATE_LIMITED', 'The transcript service is busy. Please wait a moment and try again.');
    }

    if (!upstream.ok) {
      console.error('Transcript TikTok provider returned HTTP', upstream.status);
      return jsonError(res, 502, 'UPSTREAM_ERROR', 'The transcript provider could not process this video. Please try again.');
    }

    const transcript = getTranscript(payload.content);
    if (!transcript) {
      return jsonError(res, 422, 'TRANSCRIPT_UNAVAILABLE', 'No transcript text was returned for this video.');
    }

    return res.status(200).json({
      transcript,
      platform: platform || 'Video',
      language: typeof payload.lang === 'string' ? payload.lang : null
    });
  } catch (error) {
    if (error && error.name === 'TimeoutError') {
      return jsonError(res, 504, 'PROVIDER_TIMEOUT', 'Transcript generation took too long. Please try again.');
    }
    console.error('Transcript TikTok transcript request failed:', error);
    return jsonError(res, 502, 'SERVICE_ERROR', 'Transcript service is temporarily unavailable. Please try again.');
  }
};
