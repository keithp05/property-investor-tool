const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jose = require('jose');
const { authenticator } = require('otplib');
const load = require('./load.cjs');
const env = { NODE_ENV: 'production', ADMIN_SECRET: 'dummy-admin-only-for-tests', NEXTAUTH_SECRET: 'dummy-signing-secret-only-for-tests' };
function setup(initial = {}) {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, { key, value }]));
  const db = { systemSetting: {
    findUnique: async ({ where }) => records.get(where.key) || null,
    create: async ({ data }) => { if (records.has(data.key)) throw new Error('Duplicate key'); records.set(data.key, { ...data }); return data; },
    update: async ({ where, data }) => { const value = { ...records.get(where.key), ...data }; records.set(where.key, value); return value; },
    upsert: async ({ where, create, update }) => { const value = records.has(where.key) ? { ...records.get(where.key), ...update } : create; records.set(where.key, value); return value; },
    delete: async ({ where }) => records.delete(where.key),
    deleteMany: async ({ where }) => ({ count: Number(records.delete(where.key)) }),
  }};
  // Sequential in-memory rollback model. PostgreSQL serialization is verified separately before deployment.
  db.$transaction = async fn => {
    const before = structuredClone(records);
    try { return await fn(db); } catch (error) { records.clear(); for (const [k,v] of before) records.set(k,v); throw error; }
  };
  const api = load('src/lib/admin-security.ts', env, { crypto, jose, otplib: { authenticator }, './prisma': { prisma: db }, './server-config': load('src/lib/server-config.ts', env) });
  return { api, records };
}
test('password alone gives no admin access; MFA enrollment, verification, and logout work', async () => {
  const { api } = setup();
  await assert.rejects(api.startAdminLogin('wrong'), /Invalid admin password/);
  const login = await api.startAdminLogin(env.ADMIN_SECRET);
  assert.equal(login.needsMfaSetup, true);
  assert.equal(await api.isAdminSession(login.token), false);
  const enrollment = await api.prepareAdminMfa(login.token);
  assert.equal((await api.prepareAdminMfa(login.token)).secret, enrollment.secret);
  await assert.rejects(api.completeAdminMfa(login.token, 'invalid'), /Invalid or already used/);
  const session = await api.completeAdminMfa(login.token, authenticator.generate(enrollment.secret));
  assert.equal(await api.isAdminSession(session), true);
  await assert.rejects(api.completeAdminMfa(login.token, authenticator.generate(enrollment.secret)), /Sign in again/);
  await api.revokeAdminSession(session);
  assert.equal(await api.isAdminSession(session), false);
});
test('configured MFA cannot be replaced and valid codes cannot be replayed on a new challenge', async () => {
  const secret = authenticator.generateSecret();
  const { api, records } = setup({ admin_mfa_verified: 'true', admin_mfa_secret: secret });
  const login = await api.startAdminLogin(env.ADMIN_SECRET);
  assert.equal(login.needsMfaSetup, false);
  await assert.rejects(api.prepareAdminMfa(login.token), /already configured/);
  await api.completeAdminMfa(login.token, authenticator.generate(secret));
  const next = await api.startAdminLogin(env.ADMIN_SECRET);
  await assert.rejects(api.completeAdminMfa(next.token, authenticator.generate(secret)), /already used/);
  assert.equal(records.get('admin_mfa_secret').value, secret);
});
test('expired challenges and five failed code attempts deny access', async () => {
  const { api, records } = setup();
  const login = await api.startAdminLogin(env.ADMIN_SECRET);
  await api.prepareAdminMfa(login.token);
  for (let n = 0; n < 5; n++) await assert.rejects(api.completeAdminMfa(login.token, 'bad-code'));
  await assert.rejects(api.prepareAdminMfa(login.token), /Sign in again/);
  const next = await api.startAdminLogin(env.ADMIN_SECRET);
  const id = jose.decodeJwt(next.token).jti;
  const record = records.get('admin_auth_challenge_' + id);
  record.value = JSON.stringify({ ...JSON.parse(record.value), expires: 1 });
  await assert.rejects(api.prepareAdminMfa(next.token), /Sign in again/);
});
test('old bypass sessions and altered signatures are rejected', async () => {
  const { api } = setup();
  const old = await new jose.SignJWT({ type: 'admin_session', mfaVerified: true }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(new TextEncoder().encode(env.NEXTAUTH_SECRET));
  assert.equal(await api.isAdminSession(old), false);
  const login = await api.startAdminLogin(env.ADMIN_SECRET);
  const parts = login.token.split('.'); parts[2] = (parts[2][0] === 'X' ? 'Y' : 'X') + parts[2].slice(1);
  await assert.rejects(api.prepareAdminMfa(parts.join('.')));
});
test('pending enrollment cannot replace a newly completed enrollment', async () => {
  const { api } = setup();
  const first = await api.startAdminLogin(env.ADMIN_SECRET);
  const second = await api.startAdminLogin(env.ADMIN_SECRET);
  const a = await api.prepareAdminMfa(first.token);
  const b = await api.prepareAdminMfa(second.token);
  await api.completeAdminMfa(first.token, authenticator.generate(a.secret));
  await assert.rejects(api.completeAdminMfa(second.token, authenticator.generate(b.secret)), /already configured/);
});
test('legacy enrollment is preserved and reports migration requirement', async () => {
  const { api, records } = setup({ admin_mfa_config: 'dummy-legacy-config' });
  await assert.rejects(api.startAdminLogin(env.ADMIN_SECRET), /needs migration/);
  assert.equal(records.get('admin_mfa_config').value, 'dummy-legacy-config');
});
test('all retired diagnostics return 404 without database or provider dependencies', async () => {
  for (const path of ['debug','debug/certn','debug/plaid','debug/sms','admin/check-db','admin/debug-env','admin/test-login','admin/test-users','auth/magic-link/test']) {
    for (const NODE_ENV of ['production','development']) {
      const routes = load(`src/app/api/${path}/route.ts`, { NODE_ENV }, { 'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } } });
      for (const handler of Object.values(routes)) assert.equal((await handler()).status, 404);
    }
  }
});
test('Next config does not publish server secrets; missing DB config cannot construct client', () => {
  assert.equal(load('next.config.ts', env).default.env, undefined);
  for (const DATABASE_URL of [undefined, '', ' ']) {
    const config = load('src/lib/server-config.ts', { DATABASE_URL });
    assert.throws(() => load('src/lib/prisma.ts', {}, { './server-config': config, '@prisma/client': { PrismaClient: class { constructor() { assert.fail('Client must not initialize'); } } } }), /Missing required server configuration/);
  }
});
test('password sign-in respects suspension and requires MFA when enabled', async () => {
  const secret = authenticator.generateSecret();
  const user = { id: 'u1', email: 'dummy@example.test', password: 'dummy-hash', isActive: true, isSuspended: false, mfaEnabled: true, mfaSecret: secret };
  const options = load('src/lib/auth.ts', env, {
    '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
    'next-auth/providers/credentials': value => value,
    bcryptjs: { compare: async value => value === 'dummy-password' },
    './prisma': { prisma: { user: { findUnique: async () => user, update: async () => user } } },
    otplib: { authenticator },
  }).authOptions;
  const authorize = options.providers[0].authorize;
  const credentials = { email: user.email, password: 'dummy-password' };
  assert.equal(await authorize(credentials), null);
  assert.equal(await authorize({ ...credentials, mfaCode: 'invalid' }), null);
  assert.equal((await authorize({ ...credentials, mfaCode: authenticator.generate(secret) })).id, user.id);
  user.isSuspended = true;
  assert.equal(await authorize({ ...credentials, mfaCode: authenticator.generate(secret) }), null);
  user.isSuspended = false; user.isActive = false; user.mfaEnabled = false;
  assert.equal(await authorize(credentials), null);
  user.isActive = true;
  assert.equal((await authorize(credentials)).id, user.id);
});
test('signup denies admin role and creates normalized account plus profile atomically', async () => {
  let write;
  const handler = load('src/app/api/auth/signup/route.ts', {}, {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    bcryptjs: { hash: async () => 'dummy-hash' }, zod: require('zod'),
    '@/lib/prisma': { prisma: { user: { create: async args => { write = args; return { id: 'u1' }; } } } },
  }).POST;
  const input = { name: 'Test', email: 'TEST@EXAMPLE.TEST', password: 'dummy-password', role: 'ADMIN' };
  assert.equal((await handler({ json: async () => input })).status, 400);
  assert.equal(write, undefined);
  input.role = 'LANDLORD';
  assert.equal((await handler({ json: async () => input })).status, 201);
  assert.equal(write.data.email, 'test@example.test');
  assert.ok(write.data.landlordProfile.create);
  assert.equal(write.select.password, undefined);
});
test('property details are scoped to the authenticated owner and exclude Plaid credentials', async () => {
  let query;
  const handler = load('src/app/api/properties/[id]/route.ts', {}, {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'next-auth': { getServerSession: async () => ({ user: { id: 'owner-a' } }) },
    '@/lib/auth': { authOptions: {} }, axios: {},
    '@/lib/prisma': { prisma: { property: { findFirst: async args => { query = args; return null; } } } },
  }).GET;
  const result = await handler({}, { params: Promise.resolve({ id: 'property-b' }) });
  assert.equal(result.status, 404);
  assert.equal(query.where.landlord.userId, 'owner-a');
  assert.equal(query.omit.plaidAccessToken, true);
});
