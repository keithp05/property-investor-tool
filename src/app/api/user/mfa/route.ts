import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Version 3 - Using raw SQL queries, columns confirmed to exist

// Generate a random Base32 secret for TOTP
function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    secret += base32chars[buffer[i] % 32];
  }
  return secret;
}

// Verify TOTP code
function verifyTOTP(secret: string, code: string): boolean {
  for (let i = -1; i <= 1; i++) {
    const time = Math.floor(Date.now() / 1000 / 30) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of secret.toUpperCase()) {
      const val = base32chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const secretBuffer = Buffer.alloc(Math.ceil(bits.length / 8));
    for (let j = 0; j < secretBuffer.length; j++) {
      secretBuffer[j] = parseInt(bits.slice(j * 8, (j + 1) * 8).padEnd(8, '0'), 2);
    }

    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const expectedCode = ((hash[offset] & 0x7f) << 24 |
                          (hash[offset + 1] & 0xff) << 16 |
                          (hash[offset + 2] & 0xff) << 8 |
                          (hash[offset + 3] & 0xff)) % 1000000;

    if (code === expectedCode.toString().padStart(6, '0')) {
      return true;
    }
  }
  return false;
}

/**
 * GET /api/user/mfa
 * Get MFA status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Use raw query to get MFA status (bypasses Prisma client type issues)
    const result = await prisma.$queryRaw<any[]>`
      SELECT "mfaEnabled", "mfaVerifiedAt" 
      FROM "User" 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = result[0];

    return NextResponse.json({
      success: true,
      version: 3,
      mfaEnabled: user.mfaEnabled || false,
      mfaVerifiedAt: user.mfaVerifiedAt,
    });

  } catch (error: any) {
    console.error('Get MFA status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get MFA status', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/mfa
 * Setup MFA - generate secret and QR code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, code } = await request.json();

    // Get user with raw query
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, "mfaEnabled", "mfaSecret"
      FROM "User" 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    if (action === 'setup') {
      // Generate new secret
      const secret = generateSecret();
      
      // Store secret using raw query
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "mfaSecret" = ${secret}
        WHERE id = ${user.id}
      `;

      // Generate QR code URL
      const issuer = 'RentalIQ';
      const otpauthUrl = `otpauth://totp/${issuer}:${user.email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      return NextResponse.json({
        success: true,
        secret,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
        manualEntry: secret,
      });
    }

    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
      }

      if (!user.mfaSecret) {
        return NextResponse.json({ success: false, error: 'MFA not setup. Please start setup first.' }, { status: 400 });
      }

      // Verify the code
      if (!verifyTOTP(user.mfaSecret, code)) {
        return NextResponse.json({ success: false, error: 'Invalid code. Please try again.' }, { status: 400 });
      }

      // Enable MFA using raw query
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "mfaEnabled" = true, "mfaVerifiedAt" = NOW()
        WHERE id = ${user.id}
      `;

      return NextResponse.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup MFA', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/mfa
 * Disable MFA
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required to disable MFA' }, { status: 400 });
    }

    // Get user with raw query
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, password, "mfaEnabled"
      FROM "User" 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 400 });
    }

    // Disable MFA using raw query
    await prisma.$executeRaw`
      UPDATE "User" 
      SET "mfaEnabled" = false, "mfaSecret" = NULL, "mfaVerifiedAt" = NULL, "mfaBackupCodes" = ARRAY[]::TEXT[]
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'MFA disabled successfully',
    });

  } catch (error: any) {
    console.error('Disable MFA error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable MFA', debug: error.message },
      { status: 500 }
    );
  }
}
