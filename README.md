# Transcript TikTok

A dark, mobile-friendly TikTok transcript generator with a focused one-link workflow.

## Current product features

- Single-link public TikTok transcript flow through `/api/transcript`.
- Clear validation, asynchronous processing states, provider errors, copy, TXT download, and JSON export.
- Optional AI actions through `/api/ai`: summarize, generate captions, and generate hooks.
- SEO landing pages for transcript generator, TikTok to text, transcript without login, Features, and free Pricing.
- Privacy and Terms pages for public-product trust and crawlable policy links.
- Local Admin product shell at `admin.html` for content/SEO queue, ad placements, and feature flags.

Open `index.html` in a browser for the frontend. Run with Vercel's development server to use the API endpoints.

## Environment

Set `SUPADATA_API_KEY` in Vercel Project Settings → Environment Variables. The key is read only by `api/transcript.js` and is never placed in browser code. Without the key, the UI intentionally shows a configuration error instead of pretending that a transcript was generated.

To enable the free-tier AI actions, set `GEMINI_API_KEY`. The endpoint prefers Gemini with `GEMINI_MODEL` defaulting to `gemini-2.5-flash`. `OPENAI_API_KEY` remains an optional paid/provider fallback when Gemini is not configured; `OPENAI_API_BASE` and `OPENAI_MODEL` can customize it. AI requests are capped to 12,000 transcript characters and only allow the three actions exposed by the UI.

## Install the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `extension` folder.
5. Open a public TikTok video and use the Transcript TikTok extension popup.

## Important limitations

Bulk processing, cloud accounts, team workspaces, translation, billing, and multi-platform support are not enabled. The Admin shell uses browser local storage and is not production authentication or cloud persistence. The AI endpoint requires an external model key and should receive server-side rate limiting before public high-volume use. The transcript provider can reject private, deleted, restricted, or unsupported videos.

## Deployment checklist

- Add `SUPADATA_API_KEY` to Vercel.
- Add `GEMINI_API_KEY` only if AI tools should be enabled. Do not add OpenAI unless you explicitly want that fallback.
- Test public TikTok links from multiple regions and with/without native captions.
- Verify private/deleted/no-speech/provider-error/rate-limit states.
- Verify AI-not-configured and AI-provider-error states.
- Update canonical URLs in public pages, `robots.txt`, and `sitemap.xml` if the domain changes.
- Keep public pages indexable and keep `/admin.html` noindex.
- Only TikTok is supported by the current public transcript workflow. Other platforms are not advertised or accepted. Bulk processing, cloud sync, and translations are not enabled yet.
