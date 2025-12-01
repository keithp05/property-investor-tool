import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

// Base32 alphabet
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length: number = 32): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

/**
 * POST /api/admin/mfa/setup
 * Generate MFA secret and QR code URI
 */
export async function POST(request: NextRequest) {
  try {
    // Verify temp token
    const tempToken = request.cookies.get('admin_temp_token')?.value;
    
    if (!tempToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(tempToken, JWT_SECRET);
      if (payload.type !== 'admin_temp') {
        throw new Error('Invalid token type');
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    // Generate new secret
    const secret = generateBase32Secret(20);
    
    // Store secret (will be verified before marking as complete)
    await prisma.systemSetting.upsert({
      where: { key: 'admin_mfa_secret' },
      update: { value: secret },
      create: { key: 'admin_mfa_secret', value: secret },
    });

    // Mark as not verified yet
    await prisma.systemSetting.upsert({
      where: { key: 'admin_mfa_verified' },
      update: { value: 'false' },
      create: { key: 'admin_mfa_verified', value: 'false' },
    });

    // Generate TOTP URI for QR code
    const issuer = 'RentalIQ Admin';
    const account = 'admin@rentaliq.com';
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    return NextResponse.json({
      success: true,
      secret,
      otpauthUri,
      message: 'Scan QR code with your authenticator app',
    });

  } catch (error: any) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'MFA setup failed' },
      { status: 500 }
    );
  }
}
