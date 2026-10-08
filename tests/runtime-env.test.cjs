const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { renderEnvironment } = require('../scripts/prepare-runtime-env.cjs');
const required = { DATABASE_URL: 'postgresql://dummy:dummy@localhost/dummy', NEXTAUTH_SECRET: 'dummy-signing-secret', NEXTAUTH_URL: 'https://example.test', ADMIN_SECRET: 'dummy-admin-key' };
test('runtime config includes only allowed app settings, not temporary AWS credentials', () => {
  const output = renderEnvironment({ ...required, AWS_ACCESS_KEY_ID: 'dummy-build-identity', AWS_SECRET_ACCESS_KEY: 'dummy-build-key', AWS_SESSION_TOKEN: 'dummy-session', UNRELATED: 'dummy-unrelated' });
  assert.ok(output.includes('DATABASE_URL='));
  assert.ok(!output.includes('dummy-build'));
  assert.ok(!output.includes('AWS_SESSION_TOKEN'));
  assert.ok(!output.includes('UNRELATED'));
});
test('missing required runtime configuration fails without printing values', () => {
  assert.throws(() => renderEnvironment({ ADMIN_SECRET: 'dummy-do-not-print' }), /Missing required deployment setting: DATABASE_URL/);
});
test('Next environment loading round-trips dummy secrets containing special characters', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-env-test-'));
  const values = { ...required, NEXTAUTH_SECRET: 'dummy$token\nnext\\path#value"', ADMIN_SECRET: "dummy'=value!${NAME}\\$literal" };
  try {
    fs.writeFileSync(path.join(dir, '.env.production'), renderEnvironment(values));
    const code = `require(${JSON.stringify(require.resolve('@next/env'))}).loadEnvConfig(${JSON.stringify(dir)});process.stdout.write(JSON.stringify({NEXTAUTH_SECRET:process.env.NEXTAUTH_SECRET,ADMIN_SECRET:process.env.ADMIN_SECRET}));`;
    const result = spawnSync(process.execPath, ['-e', code], { env: { PATH: process.env.PATH, NODE_ENV: 'production' }, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { NEXTAUTH_SECRET: values.NEXTAUTH_SECRET, ADMIN_SECRET: values.ADMIN_SECRET });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('unsupported dotenv values fail with only the setting name', () => {
  assert.throws(() => renderEnvironment({ ...required, ADMIN_SECRET: "dummy'`secret" }), /^Error: Unsupported characters in deployment setting: ADMIN_SECRET$/);
});
