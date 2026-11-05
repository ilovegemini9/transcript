const test = require('node:test');
const assert = require('node:assert/strict');
const { safeEqual, createSession, verifySession, SESSION_SECONDS } = require('./admin-session');

test('compares secrets without accepting different values', () => {
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('same', 'different'), false);
  assert.equal(safeEqual('short', 'longer'), false);
});

test('creates an expiring signed admin session', () => {
  const now = 1_800_000_000_000;
  const token = createSession('test-secret-with-more-than-32-characters', now);
  assert.equal(verifySession(token, 'test-secret-with-more-than-32-characters', now), true);
  assert.equal(verifySession(token, 'wrong-secret-with-more-than-32-characters', now), false);
  assert.equal(verifySession(token, 'test-secret-with-more-than-32-characters', now + (SESSION_SECONDS + 1) * 1000), false);
});

test('rejects malformed and tampered session tokens', () => {
  const token = createSession('test-secret-with-more-than-32-characters');
  assert.equal(verifySession('not-a-token', 'test-secret-with-more-than-32-characters'), false);
  assert.equal(verifySession(token + 'x', 'test-secret-with-more-than-32-characters'), false);
});
