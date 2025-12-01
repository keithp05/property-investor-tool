import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';

// Base32 decode for TOTP
function base32Decode(encoded: string): Buffer {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits: number[] = [];
  
  for (const char of encoded.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }
  
  return Buffer.from(bytes);
}

// Generate TOTP code
function generateTOTP(secret: string, timeStep: number = 0): string {
  const time = Math.floor(Date.now() / 1000 / 30) + timeStep;
  const timeBuffer = Buffer.alloc(8);
  
  // Write time as big-endian 64-bit integer
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = time & 0xff;
    // @ts-ignore
    time = time >> 8;
  }
  
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP with time window
function verifyTOTP(secret: string, code: string): boolean {
  // Check current time and ±1 step for clock drift
  for (let i = -1; i <= 1; i++) {
    if (generateTOTP(secret, i) === code) {
      return true;
    }
  }
  return false;
}

async function getAdminSession(sessionToken: string) {
  const sessionKey = `admin_session_${sessionToken.substring(0, 16)}`;
  const session = await prisma.systemSetting.findUnique({
    where: { key: sessionKey },
  });

  if (!session) return null;

  try {
    const data = JSON.parse(session.value);
    if (data.token !== sessionToken) return null;
    if (new Date(data.expiresAt) < new Date()) return null;
    return { ...data, key: sessionKey };
  } catch {
    return null;
  }
}

async function updateAdminSession(sessionKey: string, updates: any) {
  const session = await prisma.systemSetting.findUnique({
    where: { key: sessionKey },
  });

  if (!session) return;

  const data = JSON.parse(session.value);
  await prisma.systemSetting.update({
    where: { key: sessionKey },
    data: {
      value: JSON.stringify({ ...data, ...updates }),
    },
  });
}

/**
 * POST /api/admin/auth/verify-mfa
 * Verify MFA code (TOTP or backup code)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: 'No admin session',
        redirect: '/admin/login',
      }, { status: 401 });
    }

    const session = await getAdminSession(sessionToken);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired session',
        redirect: '/admin/login',
      }, { status: 401 });
    }

    const body = await request.json();
    const { code, isBackupCode } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Get MFA config (pending for first-time setup, or existing)
    let mfaConfig = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_config' },
    });

    const pendingConfig = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_pending' },
    });

    // First-time setup verification
    if (!mfaConfig && pendingConfig) {
      const pending = JSON.parse(pendingConfig.value);
      
      if (!verifyTOTP(pending.secret, code)) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code' },
          { status: 401 }
        );
      }

      // Move pending to permanent config
      await prisma.systemSetting.create({
        data: {
          key: 'admin_mfa_config',
          value: JSON.stringify({
            secret: pending.secret,
            backupCodes: pending.backupCodes,
            enabledAt: new Date().toISOString(),
          }),
        },
      });

      // Delete pending config
      await prisma.systemSetting.delete({
        where: { key: 'admin_mfa_pending' },
      });

      // Mark session as MFA verified
      await updateAdminSession(session.key, { mfaVerified: true });

      return NextResponse.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    }

    // Regular MFA verification
    if (!mfaConfig) {
      return NextResponse.json({
        success: false,
        error: 'MFA is not configured',
        redirect: '/admin/setup-mfa',
      }, { status: 400 });
    }

    const config = JSON.parse(mfaConfig.value);

    if (isBackupCode) {
      // Verify backup code
      const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
      const codeIndex = config.backupCodes.indexOf(codeHash);

      if (codeIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Invalid backup code' },
          { status: 401 }
        );
      }

      // Remove used backup code
      config.backupCodes.splice(codeIndex, 1);
      await prisma.systemSetting.update({
        where: { key: 'admin_mfa_config' },
        data: {
          value: JSON.stringify(config),
        },
      });

      // Mark session as MFA verified
      await updateAdminSession(session.key, { mfaVerified: true });

      return NextResponse.json({
        success: true,
        message: 'Verified with backup code',
        remainingBackupCodes: config.backupCodes.length,
      });
    }

    // Verify TOTP
    if (!verifyTOTP(config.secret, code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Mark session as MFA verified
    await updateAdminSession(session.key, { mfaVerified: true });

    return NextResponse.json({
      success: true,
      message: 'MFA verified successfully',
    });

  } catch (error: any) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed', details: error.message },
      { status: 500 }
    );
  }
}
