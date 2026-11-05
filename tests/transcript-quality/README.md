# Multilingual transcript quality benchmark

This benchmark measures transcript quality separately from API unit tests. It does not call Supadata and does not contain invented benchmark results.

## Add a fixture

Create `fixtures.json` in this directory (it is intentionally not populated with fabricated audio or references). Use licensed or explicitly consented recordings and a human-verified reference transcript.

```json
[
  {
    "id": "en-clean-001",
    "language": "en",
    "source": "youtube",
    "audio": "private fixture identifier or controlled test asset",
    "status": "success",
    "reference": "The human-verified words spoken in the recording.",
    "transcript": "The words returned by the transcription service."
  },
  {
    "id": "fr-unavailable-001",
    "language": "fr",
    "source": "tiktok",
    "status": "failed",
    "reference": "Bonjour tout le monde.",
    "transcript": ""
  },
  {
    "id": "mixed-en-ar-001",
    "language": "mixed",
    "source": "youtube",
    "status": "success",
    "reference": "Hello مرحبا",
    "transcript": "Hello مرحبا"
  }
]
```

Use the two-letter ISO 639-1 language code for single-language samples. Use `mixed` for code-switching samples and describe the language combination in the fixture id or metadata. Include successful and failed attempts so the failure rate is measurable. Keep private media and personal data out of Git; use controlled asset identifiers or a secure test dataset.

## Run

```sh
node --test scripts/transcript-quality.test.js
node scripts/transcript-quality.js
node scripts/transcript-quality.js path/to/your/fixtures.json
```

The report calculates corpus-level word error rate (WER), character error rate (CER), and failure rate per language. WER/CER are `n/a` when there are no successful scored samples. An empty fixture set is explicitly reported as **no benchmark data**, never as a pass.

## Benchmark design

- Cover every language the product actually offers, plus code-switched speech.
- Include clean speech, noise, music, varied accents, short and long clips, and all supported source platforms.
- Use at least two independently human-reviewed reference transcripts for each difficult sample where practical.
- Keep source, model/provider settings, requested language, returned language, and date with each fixture.
- Compare like-for-like samples when changing provider settings; don't compare different audio sets as if they were equivalent.
- Set acceptance thresholds only after collecting a representative baseline. Do not claim accuracy from a small convenience sample.
