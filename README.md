# ClipText

A dark, mobile-friendly TikTok transcript generator with a focused one-link workflow.

## Current product features

- Single-link public TikTok transcript flow through `/api/transcript`.
- Clear validation, asynchronous processing states, provider errors, copy, and TXT download.
- Local Workspace at `app.html` with saved links, search, remove, and delete-all controls.
- Privacy and Terms pages for public-product trust and crawlable policy links.
- Chrome Extension Manifest V3 that saves the current TikTok video and imports it into the Workspace.
- Local Admin product shell at `admin.html` for content/SEO queue, ad placements, and feature flags.

Open `index.html` in a browser for the frontend. Run with Vercel's development server to use the API endpoint.

## Install the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `extension` folder.
5. Open a public TikTok video and use the ClipText extension popup.

## Environment

Set `SUPADATA_API_KEY` in Vercel Project Settings → Environment Variables. The key is read only by `api/transcript.js` and is never placed in browser code. Without the key, the UI intentionally shows a configuration error instead of pretending that a transcript was generated.

## Important limitations

Bulk processing, cloud accounts, team workspaces, AI repurposing, translations, billing, and multi-platform support are not enabled yet. The Workspace and Admin shell use browser local storage and are not production authentication or cloud persistence. The transcript provider can reject private, deleted, restricted, or unsupported videos.

## Deployment checklist

- Add `SUPADATA_API_KEY` to Vercel.
- Test public TikTok links from multiple regions and with/without native captions.
- Verify private/deleted/no-speech/provider-error/rate-limit states.
- Update canonical URLs in public pages, `robots.txt`, and `sitemap.xml` if the domain changes.
- Keep public pages indexable and keep `/app.html` and `/admin.html` noindex.
- Do not claim support for Instagram, YouTube, bulk processing, AI, or cloud sync until those backends are implemented.
