import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';

// Version 5 - Using otplib for proper TOTP implementation

// Configure authenticator
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1, // Allow 1 step before/after for clock drift
};

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
      version: 5,
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
 * Setup MFA - generate secret and otpauth URL
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
      // Generate new secret using otplib
      const secret = authenticator.generateSecret();
      
      // Store secret using raw query
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "mfaSecret" = ${secret}
        WHERE id = ${user.id}
      `;

      // Generate otpauth URL using otplib
      const issuer = 'RentalIQ';
      const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);

      console.log('MFA Setup - Generated secret for:', user.email);
      console.log('MFA Setup - otpauth URL:', otpauthUrl);

      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
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

      console.log('MFA Verify - Checking code for:', user.email);
      console.log('MFA Verify - Secret:', user.mfaSecret);
      console.log('MFA Verify - Code provided:', code);

      // Verify the code using otplib
      const isValid = authenticator.verify({
        token: code,
        secret: user.mfaSecret,
      });

      console.log('MFA Verify - Is valid:', isValid);

      // Also check what the current valid code should be
      const currentToken = authenticator.generate(user.mfaSecret);
      console.log('MFA Verify - Current expected token:', currentToken);

      if (!isValid) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid code. Please try again.',
          debug: `Expected: ${currentToken}, Got: ${code}`
        }, { status: 400 });
      }

      // Enable MFA using raw query
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "mfaEnabled" = true, "mfaVerifiedAt" = NOW()
        WHERE id = ${user.id}
      `;

      console.log('MFA Verify - MFA enabled successfully for:', user.email);

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
