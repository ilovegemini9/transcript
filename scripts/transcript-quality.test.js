'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, distance, scorePair, evaluate } = require('./transcript-quality');

test('normalizes Unicode text without stripping letters or diacritics', () => {
  assert.equal(normalize('  CAFÉ، مرحباً!  '), 'café مرحباً');
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

test('reports per-language WER, CER, and failure rate', () => {
  const report = evaluate([
    { language: 'en', reference: 'hello world', transcript: 'hello world' },
    { language: 'en', reference: 'good morning', transcript: 'good' },
    { language: 'fr', status: 'failed', reference: 'bonjour', transcript: '' },
    { language: 'mixed', reference: 'hello مرحبا', transcript: 'hello مرحبا' }
  ]);
  assert.equal(report.fixtureCount, 4);
  assert.deepEqual(report.languages.map(row => row.language), ['en', 'fr', 'mixed']);
  assert.equal(report.languages[0].wer, 1 / 4);
  assert.equal(report.languages[1].failureRate, 1);
  assert.equal(report.languages[1].wer, null);
  assert.equal(report.languages[2].wer, 0);
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
