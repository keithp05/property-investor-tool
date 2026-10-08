import { randomUUID, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { authenticator } from 'otplib';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { requireServerEnv } from './server-config';

const issuer = 'rentaliq-admin';
const audience = 'rentaliq-admin-portal';
const challengePrefix = 'admin_auth_challenge_';
const sessionPrefix = 'admin_auth_session_';
const challengeSeconds = 600;
export const adminSessionSeconds = 8 * 60 * 60;
export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

type Tx = Prisma.TransactionClient;
type Challenge = { expires: number; attempts: number; setup: boolean; secret?: string };
export class AdminAuthError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}
function signingKey() { return new TextEncoder().encode(requireServerEnv('NEXTAUTH_SECRET')); }
function equalSecret(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function token(type: string, id: string, seconds: number) {
  return new SignJWT({ type, authVersion: 2 })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setAudience(audience)
    .setJti(id).setIssuedAt().setExpirationTime(`${seconds}s`).sign(signingKey());
}
async function verify(value: string | undefined, type: string) {
  if (!value) throw new AdminAuthError('Sign in again');
  try {
    const { payload } = await jwtVerify(value, signingKey(), { algorithms: ['HS256'], issuer, audience });
    if (payload.type !== type || payload.authVersion !== 2 || !payload.jti) throw new Error('Invalid session');
    return payload.jti;
  } catch { throw new AdminAuthError('Invalid or expired session'); }
}
async function enrollment(db: Tx) {
  const verified = await db.systemSetting.findUnique({ where: { key: 'admin_mfa_verified' } });
  const secret = await db.systemSetting.findUnique({ where: { key: 'admin_mfa_secret' } });
  if (verified?.value === 'true') {
    if (!secret?.value) throw new AdminAuthError('Administrator MFA configuration needs repair', 503);
    return secret.value;
  }
  // Do not silently replace an enrollment created by the legacy admin flow.
  const legacy = await db.systemSetting.findUnique({ where: { key: 'admin_mfa_config' } });
  if (legacy) throw new AdminAuthError('Legacy administrator MFA needs migration', 503);
  return null;
}
async function transaction<T>(operation: (db: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: 'Serializable' }); }
    catch (error) {
      if (attempt < 2 && typeof error === 'object' && error && 'code' in error && error.code === 'P2034') continue;
      throw error;
    }
  }
}
async function readChallenge(db: Tx, id: string): Promise<Challenge> {
  const record = await db.systemSetting.findUnique({ where: { key: challengePrefix + id } });
  if (!record) throw new AdminAuthError('Sign in again');
  const challenge: Challenge = JSON.parse(record.value);
  if (challenge.expires <= Date.now() || challenge.attempts >= 5) throw new AdminAuthError('Sign in again');
  return challenge;
}
export async function startAdminLogin(password: unknown) {
  const expected = requireServerEnv('ADMIN_SECRET');
  signingKey();
  if (typeof password !== 'string' || !equalSecret(password, expected)) throw new AdminAuthError('Invalid admin password');
  const id = randomUUID();
  const setup = await transaction(async db => {
    const existing = await enrollment(db);
    const challenge: Challenge = { expires: Date.now() + challengeSeconds * 1000, attempts: 0, setup: !existing };
    await db.systemSetting.create({ data: { key: challengePrefix + id, value: JSON.stringify(challenge), isPublic: false } });
    return challenge.setup;
  });
  return { token: await token('admin_challenge', id, challengeSeconds), needsMfaSetup: setup, maxAge: challengeSeconds };
}
export async function prepareAdminMfa(value: string | undefined) {
  const id = await verify(value, 'admin_challenge');
  const secret = await transaction(async db => {
    const challenge = await readChallenge(db, id);
    if (!challenge.setup || await enrollment(db)) throw new AdminAuthError('MFA is already configured', 409);
    challenge.secret ||= authenticator.generateSecret();
    await db.systemSetting.update({ where: { key: challengePrefix + id }, data: { value: JSON.stringify(challenge) } });
    return challenge.secret;
  });
  return { secret, otpauthUri: authenticator.keyuri('admin', 'RentalIQ Admin', secret) };
}
export async function completeAdminMfa(value: string | undefined, code: unknown) {
  const id = await verify(value, 'admin_challenge');
  const sessionId = randomUUID();
  const accepted = await transaction(async db => {
    const challenge = await readChallenge(db, id);
    const existing = await enrollment(db);
    if (challenge.setup && existing) throw new AdminAuthError('MFA is already configured; sign in again', 409);
    const secret = existing || challenge.secret;
    if (!secret) throw new AdminAuthError('Set up your authenticator first', 400);
    const verifier = authenticator.clone();
    verifier.options = { window: 1, epoch: Date.now() };
    const delta = typeof code === 'string' && /^\d{6}$/.test(code) ? verifier.checkDelta(code, secret) : null;
    const step = Math.floor(Date.now() / 30000) + (delta ?? 0);
    const previous = await db.systemSetting.findUnique({ where: { key: 'admin_mfa_last_step' } });
    if (delta === null || (previous && step <= Number(previous.value))) {
      // Commit failed attempts instead of throwing inside the transaction.
      challenge.attempts++;
      await db.systemSetting.update({ where: { key: challengePrefix + id }, data: { value: JSON.stringify(challenge) } });
      return false;
    }
    if (challenge.setup) {
      for (const [key, value] of [['admin_mfa_secret', secret], ['admin_mfa_verified', 'true']]) {
        await db.systemSetting.upsert({ where: { key }, create: { key, value, isPublic: false }, update: { value, isPublic: false } });
      }
    }
    await db.systemSetting.upsert({ where: { key: 'admin_mfa_last_step' }, create: { key: 'admin_mfa_last_step', value: String(step) }, update: { value: String(step) } });
    await db.systemSetting.delete({ where: { key: challengePrefix + id } });
    await db.systemSetting.create({ data: { key: sessionPrefix + sessionId, value: String(Date.now() + adminSessionSeconds * 1000), isPublic: false } });
    return true;
  });
  if (!accepted) throw new AdminAuthError('Invalid or already used code');
  return token('admin_session', sessionId, adminSessionSeconds);
}
export async function isAdminSession(value: string | undefined) {
  try {
    const id = await verify(value, 'admin_session');
    const session = await prisma.systemSetting.findUnique({ where: { key: sessionPrefix + id } });
    return !!session && Number(session.value) > Date.now();
  } catch { return false; }
}
export async function revokeAdminSession(value: string | undefined) {
  if (!value) return;
  let id: string;
  try { id = await verify(value, 'admin_session'); } catch { return; }
  await prisma.systemSetting.deleteMany({ where: { key: sessionPrefix + id } });
}
