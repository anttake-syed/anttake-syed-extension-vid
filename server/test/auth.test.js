const test = require('node:test');
const assert = require('node:assert/strict');
const { loadWithFakeDb, mockRes } = require('./helpers');

process.env.GOOGLE_CLIENT_ID = 'test-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/callback';

const { isAllowedWebOrigin } = require('../src/utils/allowedOrigins');
const auth = loadWithFakeDb('../src/controllers/authController', {});

test('only our own web apps are allowed origins', () => {
  assert.equal(isAllowedWebOrigin('https://antcapture.anttake.com'), true);
  assert.equal(isAllowedWebOrigin('http://localhost:5173'), true);
  assert.equal(isAllowedWebOrigin('https://evil.com'), false);
  assert.equal(isAllowedWebOrigin('https://antcapture.anttake.com.evil.com'), false);
  assert.equal(isAllowedWebOrigin(undefined), false);
});

test('sign-in refuses to send tokens to an unknown origin', () => {
  const res = mockRes();
  auth.googleAuth({ query: { origin: 'https://evil.com' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.redirectedTo, null);
});

test('sign-in from our dashboard redirects to Google with a nonce bound to a cookie', () => {
  const res = mockRes();
  auth.googleAuth({ query: { source: 'web', origin: 'https://antcapture.anttake.com' } }, res);
  assert.equal(res.statusCode, 302);
  assert.match(res.redirectedTo, /^https:\/\/accounts\.google\.com\//);
  const state = JSON.parse(new URL(res.redirectedTo).searchParams.get('state'));
  assert.ok(res.cookies.ac_oauth_state);
  assert.equal(state.nonce, res.cookies.ac_oauth_state);
});

test('callback rejects a state that is not bound to this browser', async () => {
  const res = mockRes();
  const state = JSON.stringify({ source: 'web', mode: 'redirect', origin: 'https://antcapture.anttake.com', nonce: 'abc' });
  await auth.googleCallback({ query: { code: 'x', state }, headers: { cookie: 'ac_oauth_state=other' } }, res);
  assert.equal(res.statusCode, 400);
});

test('callback rejects a forged origin even with a valid nonce', async () => {
  const res = mockRes();
  const state = JSON.stringify({ source: 'web', mode: 'popup', origin: 'https://evil.com', nonce: 'abc' });
  await auth.googleCallback({ query: { code: 'x', state }, headers: { cookie: 'ac_oauth_state=abc' } }, res);
  assert.equal(res.statusCode, 400);
});

test('OAuth error text is HTML-escaped', async () => {
  const res = mockRes();
  await auth.googleCallback({ query: { error: '<script>alert(1)</script>' }, headers: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.ok(!res.body.includes('<script>'));
});
