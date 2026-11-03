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
