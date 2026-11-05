#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalize(value) {
  return String(value || '')
    .normalize('NFC')
    .toLocaleLowerCase()
    // Keep combining marks: Arabic tashkeel and other language diacritics
    // are meaningful transcript content and must count in quality scoring.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function distance(left, right) {
  const a = Array.from(left);
  const b = Array.from(right);
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function scorePair(reference, hypothesis) {
  const refWords = normalize(reference).split(' ').filter(Boolean);
  const hypWords = normalize(hypothesis).split(' ').filter(Boolean);
  const refChars = Array.from(normalize(reference).replace(/\s/gu, ''));
  const hypChars = Array.from(normalize(hypothesis).replace(/\s/gu, ''));
  return {
    wordErrors: distance(refWords, hypWords),
    referenceWords: refWords.length,
    characterErrors: distance(refChars, hypChars),
    referenceCharacters: refChars.length
  };
}

function evaluate(fixtures) {
  if (!Array.isArray(fixtures)) throw new TypeError('Fixtures must be a JSON array.');
  const groups = new Map();
  for (const [index, fixture] of fixtures.entries()) {
    if (!fixture || typeof fixture !== 'object') throw new TypeError('Fixture ' + index + ' must be an object.');
    const language = typeof fixture.language === 'string' ? fixture.language.trim().toLowerCase() : '';
    if (!/^(?:[a-z]{2}|mixed)$/u.test(language)) throw new TypeError('Fixture ' + index + ' has an invalid language code.');
    const failed = fixture.status === 'failed' || typeof fixture.transcript !== 'string' || !fixture.transcript.trim();
    if (!failed && (typeof fixture.reference !== 'string' || !fixture.reference.trim())) {
      throw new TypeError('Successful fixture ' + index + ' needs a reference transcript.');
    }
    if (!groups.has(language)) groups.set(language, { language, total: 0, failures: 0, wordErrors: 0, referenceWords: 0, characterErrors: 0, referenceCharacters: 0 });
    const group = groups.get(language);
    group.total++;
    if (failed) {
      group.failures++;
      continue;
    }
    const score = scorePair(fixture.reference, fixture.transcript);
    group.wordErrors += score.wordErrors;
    group.referenceWords += score.referenceWords;
    group.characterErrors += score.characterErrors;
    group.referenceCharacters += score.referenceCharacters;
  }
  const rows = Array.from(groups.values()).sort((a, b) => a.language.localeCompare(b.language));
  return {
    fixtureCount: fixtures.length,
    languages: rows.map(row => ({
      language: row.language,
      samples: row.total,
      failures: row.failures,
      failureRate: row.total ? row.failures / row.total : 0,
      wer: row.referenceWords ? row.wordErrors / row.referenceWords : null,
      cer: row.referenceCharacters ? row.characterErrors / row.referenceCharacters : null
    }))
  };
}

function formatReport(report) {
  const lines = [
    'Multilingual transcript quality report',
    'Fixtures: ' + report.fixtureCount,
    '',
    'Language | Samples | Failures | Failure rate | WER | CER',
    '--- | ---: | ---: | ---: | ---: | ---:'
  ];
  for (const row of report.languages) {
    const pct = value => (value * 100).toFixed(1) + '%';
    lines.push([
      row.language,
      row.samples,
      row.failures,
      pct(row.failureRate),
      row.wer === null ? 'n/a' : pct(row.wer),
      row.cer === null ? 'n/a' : pct(row.cer)
    ].join(' | '));
  }
  if (!report.fixtureCount) lines.push('', 'No benchmark fixtures yet. Add licensed, consented recordings and human-verified references; do not treat empty results as a quality pass.');
  return lines.join('\n');
}

if (require.main === module) {
  const fixturePath = path.resolve(process.argv[2] || 'tests/transcript-quality/fixtures.json');
  if (!fs.existsSync(fixturePath)) {
    console.log(formatReport(evaluate([])));
  } else {
    try {
      const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      console.log(formatReport(evaluate(fixtures)));
    } catch (error) {
      console.error('Could not evaluate transcript fixtures:', error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { normalize, distance, scorePair, evaluate, formatReport };
