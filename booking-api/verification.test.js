import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyHuman } from './server.js';

test('a long legitimate CAPTCHA token is verified by Google', async () => {
  const fetchBefore = globalThis.fetch;
  const secretBefore = process.env.RECAPTCHA_SECRET_KEY;
  process.env.RECAPTCHA_SECRET_KEY = 'synthetic-unit-test-secret';
  const token = 'synthetic-response-'.repeat(220);
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
    assert.equal(options.body.get('response'), token);
    return { ok: true, json: async () => ({ success: true, hostname: 'daytanalytics.com' }) };
  };
  try {
    assert.equal(await verifyHuman(token), true);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = fetchBefore;
    if (secretBefore === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = secretBefore;
  }
});

test('invalid, oversized and wrong-domain CAPTCHA results remain rejected', async () => {
  const fetchBefore = globalThis.fetch;
  const secretBefore = process.env.RECAPTCHA_SECRET_KEY;
  process.env.RECAPTCHA_SECRET_KEY = 'synthetic-unit-test-secret';
  let result = { success: true, hostname: 'untrusted.example' };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => result }; };
  try {
    assert.equal(await verifyHuman('synthetic-response'), false);
    result = { success: false, 'error-codes': ['invalid-input-response'] };
    assert.equal(await verifyHuman('synthetic-response'), false);
    assert.equal(await verifyHuman(''), false);
    assert.equal(await verifyHuman('x'.repeat(8193)), false);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = fetchBefore;
    if (secretBefore === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = secretBefore;
  }
});
