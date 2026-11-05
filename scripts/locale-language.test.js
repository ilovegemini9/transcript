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
  test(relativePath + ' requests transcripts in its selected language', () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /fetch\(['"]\/api\/transcript['"]/);
    const requestBody = new RegExp(
      String.raw`body:\\s*JSON\\.stringify\\(\\{\\s*(?:url\\s*:\\s*value|url)\\s*,\\s*lang\\s*:\\s*['"]${language}['"]\\s*\\}\\)`
    );
    assert.match(html, requestBody, 'initial transcript request must send lang=' + language);
  });
}
