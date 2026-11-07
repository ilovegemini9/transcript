const crypto = require('node:crypto');

const COOKIE_NAME = 'transcript_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

function getConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret || secret.length < 32) return null;
  return { password, secret };
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createSession(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString('base64url');
  return payload + '.' + sign(payload, secret);
}

function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !safeEqual(sign(parts[0], secret), parts[1])) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return Number.isInteger(payload.exp) && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

function readCookie(req, name = COOKIE_NAME) {
  const header = req.headers?.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) { try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; } }
  }
  return '';
}

function hasAdminSession(req) {
  const config = getConfig();
  return Boolean(config && verifySession(readCookie(req), config.secret));
}

module.exports = { COOKIE_NAME, SESSION_SECONDS, getConfig, safeEqual, createSession, verifySession, readCookie, hasAdminSession };
