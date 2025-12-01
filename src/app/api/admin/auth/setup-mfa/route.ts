import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';

// Simple TOTP implementation
function generateSecret(): string {
  // Generate a 20-byte secret and encode as base32
  const buffer = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    secret += base32Chars[byte >> 3];
    if (i + 1 < buffer.length) {
      secret += base32Chars[((byte & 0x07) << 2) | (buffer[i + 1] >> 6)];
      secret += base32Chars[(buffer[i + 1] >> 1) & 0x1f];
      if (i + 2 < buffer.length) {
        secret += base32Chars[((buffer[i + 1] & 0x01) << 4) | (buffer[i + 2] >> 4)];
        i += 2;
      } else {
        secret += base32Chars[(buffer[i + 1] & 0x01) << 4];
        i += 1;
      }
    } else {
      secret += base32Chars[(byte & 0x07) << 2];
    }
  }
  
  return secret.substring(0, 32); // Standard 32-char secret
}

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
  }
  return codes;
}

function generateQRCodeUrl(secret: string, issuer: string, accountName: string): string {
  const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  
  // Use Google Charts API for QR code (simple, no dependencies)
  return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
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
    return data;
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/auth/setup-mfa
 * Generate MFA secret and QR code
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
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

    // Check if MFA is already set up
    const existingConfig = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_config' },
    });

    if (existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'MFA is already configured',
        redirect: '/admin/verify-mfa',
      }, { status: 400 });
    }

    // Generate new MFA secret and backup codes
    const secret = generateSecret();
    const backupCodes = generateBackupCodes(8);
    
    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Store pending MFA config (not yet verified)
    await prisma.systemSetting.upsert({
      where: { key: 'admin_mfa_pending' },
      update: {
        value: JSON.stringify({
          secret,
          backupCodes: hashedBackupCodes,
          createdAt: new Date().toISOString(),
        }),
      },
      create: {
        key: 'admin_mfa_pending',
        value: JSON.stringify({
          secret,
          backupCodes: hashedBackupCodes,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    // Generate QR code URL
    const qrCode = generateQRCodeUrl(secret, 'RentalIQ Admin', 'admin@rentaliq.com');

    return NextResponse.json({
      success: true,
      qrCode,
      secret,
      backupCodes, // Return plain codes for user to save
    });

  } catch (error: any) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set up MFA', details: error.message },
      { status: 500 }
    );
  }
}
