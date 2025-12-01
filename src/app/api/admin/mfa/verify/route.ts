import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

// Base32 decode
function base32Decode(encoded: string): Buffer {
  const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  encoded = encoded.toUpperCase().replace(/=+$/, '');
  
  let bits = '';
  for (const char of encoded) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  
  return Buffer.from(bytes);
}

// Generate TOTP
function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6, offset: number = 0): string {
  const time = Math.floor(Date.now() / 1000 / timeStep) + offset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));
  
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset_idx = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset_idx] & 0x7f) << 24) |
    ((hash[offset_idx + 1] & 0xff) << 16) |
    ((hash[offset_idx + 2] & 0xff) << 8) |
    (hash[offset_idx + 3] & 0xff)
  ) % Math.pow(10, digits);
  
  return code.toString().padStart(digits, '0');
}

// Verify TOTP with time window
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, 30, 6, i);
    if (expected === token) {
      return true;
    }
  }
  return false;
}

/**
 * POST /api/admin/mfa/verify
 * Verify MFA code and grant admin session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify temp token
    const tempToken = request.cookies.get('admin_temp_token')?.value;
    
    if (!tempToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    let isSetup = false;
    try {
      const { payload } = await jwtVerify(tempToken, JWT_SECRET);
      if (payload.type !== 'admin_temp') {
        throw new Error('Invalid token type');
      }
      isSetup = payload.needsMfaSetup as boolean;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ success: false, error: 'Invalid code format' }, { status: 400 });
    }

    // Get stored secret
    const secretSetting = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_secret' },
    });

    if (!secretSetting) {
      return NextResponse.json({ success: false, error: 'MFA not configured' }, { status: 400 });
    }

    // Verify TOTP
    if (!verifyTOTP(secretSetting.value, code)) {
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 401 });
    }

    // If this is initial setup, mark MFA as verified
    if (isSetup) {
      await prisma.systemSetting.upsert({
        where: { key: 'admin_mfa_verified' },
        update: { value: 'true' },
        create: { key: 'admin_mfa_verified', value: 'true' },
      });
    }

    // Create admin session token (valid for 8 hours)
    const adminToken = await new SignJWT({ 
      type: 'admin_session',
      mfaVerified: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: 'MFA verified successfully',
    });

    // Set admin session cookie
    response.cookies.set('admin_session', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    // Clear temp token
    response.cookies.delete('admin_temp_token');

    return response;

  } catch (error: any) {
    console.error('MFA verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
