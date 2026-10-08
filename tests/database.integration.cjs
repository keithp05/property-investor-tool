const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { authenticator } = require('otplib');
const load = require('./load.cjs');
// Fixed disposable Unix socket: this test cannot accept a live DATABASE_URL.
const url = 'postgresql://repair_test@localhost:55439/postgres?host=/tmp/realestate-repair-db/socket';
const prisma = new PrismaClient({ datasources: { db: { url } } });
const env = { ADMIN_SECRET: 'dummy-db-admin-password', NEXTAUTH_SECRET: 'dummy-db-signing-key' };
const api = load('src/lib/admin-security.ts', env, {
  crypto: require('node:crypto'), jose: require('jose'), otplib: { authenticator },
  './prisma': { prisma }, './server-config': load('src/lib/server-config.ts', env),
});
async function cleanup() {
  await prisma.systemSetting.deleteMany({ where: { key: { startsWith: 'admin_' } } });
  await prisma.user.deleteMany({ where: { email: 'dummy@example.test' } });
}
before(cleanup);
after(async () => { await cleanup(); await prisma.$disconnect(); });
test('PostgreSQL serializes concurrent MFA completion and revokes the resulting session', async () => {
  const login = await api.startAdminLogin(env.ADMIN_SECRET);
  assert.equal(login.needsMfaSetup, true);
  const setup = await api.prepareAdminMfa(login.token);
  const code = authenticator.generate(setup.secret);
  const results = await Promise.allSettled([api.completeAdminMfa(login.token, code), api.completeAdminMfa(login.token, code)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const session = results.find(result => result.status === 'fulfilled').value;
  assert.equal(await api.isAdminSession(session), true);
  await api.revokeAdminSession(session);
  assert.equal(await api.isAdminSession(session), false);
  const retry = await api.startAdminLogin(env.ADMIN_SECRET);
  await assert.rejects(api.completeAdminMfa(retry.token, code));
});
test('PostgreSQL creates signup profile atomically and enforces normalized email uniqueness', async () => {
  const handler = load('src/app/api/auth/signup/route.ts', {}, {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    bcryptjs: { hash: async () => 'dummy-test-hash' }, zod: require('zod'), '@/lib/prisma': { prisma },
  }).POST;
  const account = { name: 'Local test landlord', email: 'DUMMY@EXAMPLE.TEST', password: 'dummy-password', role: 'LANDLORD' };
  const created = await handler({ json: async () => account });
  assert.equal(created.status, 201);
  assert.ok(await prisma.landlordProfile.findUnique({ where: { userId: created.body.user.id } }));
  const duplicate = await handler({ json: async () => ({ ...account, email: 'dummy@example.test' }) });
  assert.equal(duplicate.status, 409);
});
