# Multilingual transcript quality benchmark

This benchmark measures transcript quality separately from API unit tests. It does not call Supadata and contains no invented benchmark results or audio. **No recordings are required to run the code or its unit tests.** Real recordings are only needed later if you choose to measure actual transcription accuracy.

## Add a fixture (optional)

Create `fixtures.json` in this directory only when you decide to run a real-world accuracy benchmark. Use licensed or explicitly consented recordings and a human-verified reference transcript. The fixture below illustrates the schema only; it is not real benchmark data.

```json
[
  {
    "id": "en-youtube-clean-001",
    "language": "en",
    "source": "youtube",
    "condition": "clean",
    "audio": "private fixture identifier or controlled test asset",
    "requestedLanguage": "en",
    "returnedLanguage": "en",
    "provider": "supadata",
    "testedAt": "2026-11-05",
    "status": "success",
    "reference": "The human-verified words spoken in the recording.",
    "transcript": "The words returned by the transcription service."
  },
  {
    "id": "fr-tiktok-noisy-001",
    "language": "fr",
    "source": "tiktok",
    "condition": "noisy",
    "audio": "private fixture identifier",
    "requestedLanguage": "fr",
    "returnedLanguage": "fr",
    "provider": "supadata",
    "testedAt": "2026-11-05",
    "status": "failed",
    "reference": "Bonjour tout le monde.",
    "transcript": ""
  },
  {
    "id": "mixed-en-ar-youtube-001",
    "language": "mixed",
    "source": "youtube",
    "condition": "code-switching",
    "audio": "private fixture identifier",
    "requestedLanguage": "ar",
    "returnedLanguage": "mixed",
    "provider": "supadata",
    "testedAt": "2026-11-05",
    "status": "success",
    "reference": "Hello مرحبا",
    "transcript": "Hello مرحبا"
  }
]
```

Use the two-letter ISO 639-1 language code for single-language samples. Use `mixed` for code-switching samples. A provider result of `mixed` is accepted as a valid detection rather than counted as a language mismatch. `source` should identify the supported platform (for example, youtube, tiktok, facebook, instagram); `condition` should describe the recording (clean, noisy, music, code-switching, accent, short, long). These dimensions are optional for older fixtures, but recommended for meaningful breakdowns.

Include successful and failed attempts so the failure rate is measurable. Keep private media, personal data, and credentials out of Git; use controlled asset identifiers or a secure test dataset. The reference transcript should be independently checked by a fluent human reviewer, including Arabic diacritics when they are audible and relevant.

## Run

```sh
node --test scripts/transcript-quality.test.js
node scripts/transcript-quality.js
node scripts/transcript-quality.js path/to/your/fixtures.json
```

The report calculates corpus-level word error rate (WER), character error rate (CER), and failure rate grouped by reference language, source platform, and recording condition. It also breaks down samples by requested and provider-returned language, and reports language mismatches (including missing provider language) separately. WER/CER are `n/a` when there are no successful scored samples. Arabic tashkeel and Unicode combining marks are retained in normalization. An empty fixture set is explicitly reported as **no benchmark data**, never as a pass.

## Benchmark design

- Cover all seven active site languages: English, French, Arabic, Spanish, Portuguese, German, and Italian, plus code-switched speech.
- For each language, aim to collect samples across clean speech, background noise, music, varied accents, short and long clips, and each supported platform where available.
- Track the requested language and provider-returned language separately; do not treat them as interchangeable.
- Use at least two independently human-reviewed reference transcripts for difficult samples where practical.
- Keep source, recording condition, provider/model settings, requested language, returned language, and test date with each fixture.
- Compare like-for-like samples when changing provider settings; don't compare different audio sets as if they were equivalent.
- Set acceptance thresholds only after collecting a representative baseline. Do not claim accuracy from a small convenience sample.
