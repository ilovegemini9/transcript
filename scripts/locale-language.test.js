'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const localePages = [
  ['index.html', 'en'],
  ['locales/fr/index.html', 'fr'],
  ['locales/es/index.html', 'es'],
  ['locales/ar/index.html', 'ar'],
  ['locales/pt/index.html', 'pt'],
  ['locales/de/index.html', 'de'],
  ['locales/it/index.html', 'it']
];

for (const [relativePath, language] of localePages) {
  test(relativePath + ' exposes transcript language selection', () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /fetch\(['"]\/api\/transcript['"]/);
    assert.match(html, /id="transcript-language"/, 'a transcript language selector must be present');
    assert.match(html, new RegExp('<option value="' + language + '"'), 'the page language must be selectable');
    assert.match(html, /value="">[^<]*(Auto|auto|autom|Autom|Détection|Detect|اكتشاف|Rilevamento)/i, 'automatic language detection must be available');
    assert.match(html, /language\.value|transcriptLanguage\.value/, 'the selected language must be sent with the request');
  });
}
