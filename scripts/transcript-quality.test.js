'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, distance, scorePair, evaluate } = require('./transcript-quality');

test('normalizes Unicode while preserving Arabic diacritics', () => {
  assert.equal(normalize('  CAFÉ، مرحباً!  '), 'café مرحباً');
  assert.notEqual(normalize('مرحبا'), normalize('مَرْحَبًا'));
});

test('calculates edit distance for word and character sequences', () => {
  assert.equal(distance(['a', 'b', 'c'], ['a', 'c']), 1);
  assert.equal(distance(Array.from('cat'), Array.from('cut')), 1);
});

test('scores multilingual transcript text', () => {
  const score = scorePair('Bonjour le monde', 'Bonjour monde');
  assert.equal(score.wordErrors, 1);
  assert.equal(score.referenceWords, 3);
  assert.equal(score.characterErrors, 2);
});

test('reports per-language, source, and recording-condition metrics', () => {
  const report = evaluate([
    { language: 'en', source: 'youtube', condition: 'clean', reference: 'hello world', transcript: 'hello world' },
    { language: 'en', source: 'youtube', condition: 'noisy', reference: 'good morning', transcript: 'good' },
    { language: 'fr', source: 'tiktok', condition: 'clean', status: 'failed', reference: 'bonjour', transcript: '' },
    { language: 'mixed', source: 'youtube', condition: 'code-switching', reference: 'hello مرحبا', transcript: 'hello مرحبا' }
  ]);
  assert.equal(report.fixtureCount, 4);
  assert.deepEqual(report.languages.map(row => row.key), ['en', 'fr', 'mixed']);
  assert.equal(report.languages[0].wer, 1 / 4);
  assert.equal(report.languages[1].failureRate, 1);
  assert.equal(report.languages[1].wer, null);
  assert.equal(report.languages[2].wer, 0);
  assert.equal(report.sources.find(row => row.key === 'youtube').samples, 3);
  assert.equal(report.conditions.find(row => row.key === 'noisy').wer, 0.5);
  assert.equal(report.conditions.find(row => row.key === 'code-switching').wer, 0);
});

test('rejects malformed fixtures and missing references for successful transcripts', () => {
  assert.throws(() => evaluate({}), /JSON array/);
  assert.throws(() => evaluate([{ language: 'english', transcript: 'hi', reference: 'hi' }]), /invalid language/);
  assert.throws(() => evaluate([{ language: 'en', transcript: 'hi' }]), /needs a reference/);
});

test('treats empty transcripts as failures', () => {
  const report = evaluate([{ language: 'de', reference: 'guten tag', transcript: '   ' }]);
  assert.equal(report.languages[0].failures, 1);
  assert.equal(report.languages[0].failureRate, 1);
});
