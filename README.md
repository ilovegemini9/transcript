# ClipText

A dark, mobile-friendly TikTok transcript tool interface.

## Current prototype features

- Single-link landing page.
- Workspace with bulk TikTok URL validation (up to 50 links).
- Local collections list.
- Chrome Extension starter (Manifest V3) to save the current TikTok tab.
- Local browser storage for the demo workspace and extension queue.

## Open the workspace

Open `app.html` in a browser, or serve this folder with any static web server.

## Install the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `extension` folder.
5. Open a TikTok video and use the ClipText extension popup.

## Important limitations

This is a frontend prototype. Bulk import currently validates and queues links; it does not process 50 transcripts. Collections and the workspace queue are stored locally in the browser, not synced to an account or cloud database. The extension has its own local queue using Chrome storage and is not yet synced with the website. A real transcript engine, backend job queue, durable database, and extension-to-site sync still need to be connected. No transcript extraction is claimed to work yet.


## Live transcript integration

The homepage calls the Vercel serverless endpoint at `/api/transcript`. It uses Supadata's TikTok-compatible API in **native captions mode**, which reads captions already available for a video and does not run AI speech generation.

### Required setup

1. Create a free Supadata account and generate an API key at https://supadata.ai.
2. In Vercel, open **Project Settings → Environment Variables**.
3. Add `SUPADATA_API_KEY` with your key for Production (and Preview if needed).
4. Redeploy the project.

The key is used only by the serverless function and is never sent to browser JavaScript. Supadata advertises a free monthly request allowance; limits and terms may change. Videos without existing captions, private videos, and restricted videos may not return a transcript. ClipText does not bypass TikTok privacy or access controls.

A static file preview cannot run the API endpoint. For local testing, use Vercel's development server and set `SUPADATA_API_KEY` in the local environment.
