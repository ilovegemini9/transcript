# Transcript TikTok

Transcript TikTok is a browser-based video transcript tool for accessible public videos from TikTok, YouTube, Facebook, and Instagram.

Website: https://transcriptiktok.vercel.app/

## Supported platforms

- TikTok public video links (including supported short links)
- YouTube videos and Shorts, including youtu.be
- Facebook public videos, including supported fb.watch links
- Instagram public Reels and video posts

The tool processes one video link per request. Private, deleted, age-restricted, region-restricted, login-only, or otherwise inaccessible videos may fail. The tool does not bypass platform privacy settings. Transcript quality depends on source audio, captions, language, and provider availability; review important text against the original video.

## Public pages

- Homepage: https://transcriptiktok.vercel.app/
- Video to text: https://transcriptiktok.vercel.app/video-to-text
- TikTok transcript: https://transcriptiktok.vercel.app/tiktok-transcript
- YouTube transcript: https://transcriptiktok.vercel.app/youtube-transcript
- Facebook video transcript: https://transcriptiktok.vercel.app/facebook-video-transcript
- Instagram Reels transcript: https://transcriptiktok.vercel.app/instagram-reels-transcript
- Features: https://transcriptiktok.vercel.app/features.html
- Pricing: https://transcriptiktok.vercel.app/pricing.html
- Privacy: https://transcriptiktok.vercel.app/privacy.html
- Terms: https://transcriptiktok.vercel.app/terms.html

## Architecture

- `index.html`: homepage, main transcript form, FAQ, and SEO metadata.
- `api/transcript.js`: Vercel serverless endpoint; validates supported HTTPS hosts and calls Supadata server-side.
- `api/transcript.test.js`: Node.js tests for URL validation, provider responses, and async jobs.
- `platform-tool.js`: shared client workflow for platform-specific landing pages.
- `tiktok-transcript.html`, `youtube-transcript.html`, `facebook-video-transcript.html`, `instagram-reels-transcript.html`, `video-to-text.html`: platform tools and SEO landing pages.
- `vercel.json`: clean URL rewrites.
- `robots.txt`, `sitemap.xml`, `llms.txt`: crawler and discovery files.

## Local development

Requires Node.js 20 or newer.

Run the API tests:

```bash
node --test api/transcript.test.js
```

The API uses the `SUPADATA_API_KEY` environment variable. Add it to the Vercel project environment settings; never expose the key in client-side JavaScript or commit it to the repository. The current integration uses Supadata's universal transcript endpoint and its `auto` mode, which prefers available captions and may fall back to generated transcription when supported.

## Deployment

The project is connected to Vercel and deploys from the `main` branch when deployment limits allow. Check the latest Vercel deployment status before treating new GitHub commits as live.

## Product boundaries

- One public video per request; no bulk queue.
- No user accounts, cloud transcript library, or cross-device sync.
- No promise of unlimited use or guaranteed transcription.
- No paid infrastructure or database is required by this repository.

## Optional free-tier AI tools

The homepage includes three transcript repurposing actions: **Summarize**, **Generate captions**, and **Generate hooks**.

To enable them with Google's Gemini Developer API free tier:

1. Create a free API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In Vercel, open the `transcript` project → **Settings** → **Environment Variables**.
3. Add `GEMINI_API_KEY` with the key from AI Studio. Keep it server-side; never put it in HTML or client JavaScript.
4. Apply it to Production (and Preview if desired), then redeploy the project.
5. The API uses `gemini-3.8-flash` by default. You can optionally override it with `GEMINI_MODEL`.

Gemini's free tier has model-specific request and token quotas; it is not unlimited. Free-tier prompts and outputs may be used by Google to improve its products, so visitors should not submit sensitive transcript content. See the [official pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

If the key is missing, transcript generation still works; only the optional AI actions remain unavailable. The API key is read only by the serverless endpoint and is never exposed to the browser.
