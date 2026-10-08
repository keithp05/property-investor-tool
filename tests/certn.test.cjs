const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./load.cjs');
const { verifyCertnSignature } = load('src/lib/certn-webhook.ts', {}, { crypto });
const now = 1800000000000;
const secret = 'dummy-certn-webhook-key';
const body = '{"id":"dummy-applicant","status":"complete"}';
const sign = t => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
test('Certn v1 accepts raw-body signature and rotation signatures', () => {
  const header = sign(now / 1000);
  assert.equal(verifyCertnSignature(body, header, secret, now), true);
  assert.equal(verifyCertnSignature(body, `${header},v1=${'0'.repeat(64)}`, secret, now), true);
});
test('Certn rejects tampered body, stale/future timestamps, missing key, malformed and downgraded signatures', () => {
  const header = sign(now / 1000);
  assert.equal(verifyCertnSignature(body + ' ', header, secret, now), false);
  for (const invalid of [null, 'v1=bad', header.replace('v1=', 'v0='), sign(now / 1000 - 301), sign(now / 1000 + 301), `${header},t=${now / 1000}`]) {
    assert.equal(verifyCertnSignature(body, invalid, secret, now), false);
  }
  assert.equal(verifyCertnSignature(body, header, '', now), false);
});
test('unsigned webhook returns before parsing body, accessing database or sending notifications', async () => {
  const handler = load('src/app/api/screening/webhook/route.ts', { CERTN_WEBHOOK_SECRET: secret }, {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    '@/lib/certn-webhook': { verifyCertnSignature }, '@/lib/prisma': {}, '@/lib/notifications': {}, '@/lib/certnService': {}, '@/lib/smsService': {},
  }).POST;
  const response = await handler({ text: async () => body, headers: { get: () => null } });
  assert.equal(response.status, 401);
});
