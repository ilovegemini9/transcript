# ClipText

A minimal, black-and-white TikTok transcript website.

## Current status

This repository currently contains the first frontend MVP:
- Responsive black-and-white landing page
- TikTok URL input and basic URL validation
- Simple how-it-works and FAQ sections
- No account or database required

**Important:** Direct TikTok transcript extraction is not implemented yet. The form currently validates the URL and explains that the extraction service still needs to be connected. Do not advertise transcription as working until a compliant, reliable source has been integrated and tested.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Free hosting

The site is static and can be hosted on GitHub Pages at no charge within GitHub's applicable usage limits.

## Next technical milestone

Evaluate a permitted way to obtain captions/transcript data from a TikTok URL. If direct access is unavailable, show a clear error rather than inventing transcript text or silently uploading user content. Keep any processing within free tiers and disclose limitations.
