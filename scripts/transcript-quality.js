#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalize(value) {
  return String(value || '')
    .normalize('NFC')
    .toLocaleLowerCase()
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
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
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

function summarize(rows) {
  return rows.map(row => ({
    key: row.key,
    samples: row.total,
    failures: row.failures,
    failureRate: row.total ? row.failures / row.total : 0,
    languageMismatches: row.languageMismatches,
    languageMismatchRate: row.total ? row.languageMismatches / row.total : 0,
    wer: row.referenceWords ? row.wordErrors / row.referenceWords : null,
    cer: row.referenceCharacters ? row.characterErrors / row.referenceCharacters : null
  }));
}

function evaluate(fixtures) {
  if (!Array.isArray(fixtures)) throw new TypeError('Fixtures must be a JSON array.');
  const dimensions = {
    language: fixture => fixture.language.trim().toLowerCase(),
    source: fixture => typeof fixture.source === 'string' && fixture.source.trim() ? fixture.source.trim().toLowerCase() : 'unspecified',
    condition: fixture => typeof fixture.condition === 'string' && fixture.condition.trim() ? fixture.condition.trim().toLowerCase() : 'unspecified',
    requestedLanguage: fixture => typeof fixture.requestedLanguage === 'string' && fixture.requestedLanguage.trim() ? fixture.requestedLanguage.trim().toLowerCase() : 'unspecified',
    returnedLanguage: fixture => typeof fixture.returnedLanguage === 'string' && fixture.returnedLanguage.trim() ? fixture.returnedLanguage.trim().toLowerCase() : 'unspecified'
  };
  const grouped = Object.fromEntries(Object.keys(dimensions).map(key => [key, new Map()]));

  for (const [index, fixture] of fixtures.entries()) {
    if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
      throw new TypeError('Fixture ' + index + ' must be an object.');
    }
    const language = typeof fixture.language === 'string' ? fixture.language.trim().toLowerCase() : '';
    if (!/^(?:[a-z]{2}|mixed)$/u.test(language)) {
      throw new TypeError('Fixture ' + index + ' has an invalid language code.');
    }
    const failed = fixture.status === 'failed' || typeof fixture.transcript !== 'string' || !fixture.transcript.trim();
    if (!failed && (typeof fixture.reference !== 'string' || !fixture.reference.trim())) {
      throw new TypeError('Successful fixture ' + index + ' needs a reference transcript.');
    }
    const score = failed ? null : scorePair(fixture.reference, fixture.transcript);

    for (const [dimension, getKey] of Object.entries(dimensions)) {
      const key = getKey({ ...fixture, language });
      const map = grouped[dimension];
      if (!map.has(key)) map.set(key, {
        key, total: 0, failures: 0, wordErrors: 0, referenceWords: 0,
        characterErrors: 0, referenceCharacters: 0, languageMismatches: 0
      });
      const row = map.get(key);
      row.total++;
      const requested = typeof fixture.requestedLanguage === 'string' ? fixture.requestedLanguage.trim().toLowerCase() : '';
      const returned = typeof fixture.returnedLanguage === 'string' ? fixture.returnedLanguage.trim().toLowerCase() : '';
      if (requested && (!returned || requested !== returned)) row.languageMismatches++;
      if (failed) {
        row.failures++;
      } else {
        row.wordErrors += score.wordErrors;
        row.referenceWords += score.referenceWords;
        row.characterErrors += score.characterErrors;
        row.referenceCharacters += score.referenceCharacters;
      }
    }
  }

  const result = { fixtureCount: fixtures.length };
  for (const dimension of Object.keys(dimensions)) {
    const rows = Array.from(grouped[dimension].values()).sort((a, b) => a.key.localeCompare(b.key));
    const outputKey = ({ language: 'languages', source: 'sources', condition: 'conditions', requestedLanguage: 'requestedLanguages', returnedLanguage: 'returnedLanguages' })[dimension];
    result[outputKey] = summarize(rows);
  }
  return result;
}

function formatReport(report) {
  const lines = ['Multilingual transcript quality report', 'Fixtures: ' + report.fixtureCount];
  const pct = value => (value * 100).toFixed(1) + '%';
  for (const [heading, rows] of [
    ['By language', report.languages],
    ['By source platform', report.sources],
    ['By recording condition', report.conditions]
  ]) {
    lines.push('', heading, 'Group | Samples | Failures | Failure rate | Language mismatches | Mismatch rate | WER | CER',
      '--- | ---: | ---: | ---: | ---: | ---: | ---: | ---:');
    for (const row of rows || []) {
      lines.push([
        row.key, row.samples, row.failures, pct(row.failureRate), row.languageMismatches, pct(row.languageMismatchRate),
        row.wer === null ? 'n/a' : pct(row.wer),
        row.cer === null ? 'n/a' : pct(row.cer)
      ].join(' | '));
    }
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
      console.log(formatReport(evaluate(JSON.parse(fs.readFileSync(fixturePath, 'utf8')))));
    } catch (error) {
      console.error('Could not evaluate transcript fixtures:', error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { normalize, distance, scorePair, evaluate, formatReport };
