import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/magic-link/verify
 * Verify a magic link token (called from the verification page)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link' },
        { status: 400 }
      );
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.json(
        { success: false, error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > magicLink.expires) {
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: magicLink.email },
      select: {
        id: true,
        email: true,
        name: true,
        mfaEnabled: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!user || !user.isActive || user.isSuspended) {
      return NextResponse.json(
        { success: false, error: 'Account not found or inactive' },
        { status: 400 }
      );
    }

    // Return verification status
    return NextResponse.json({
      success: true,
      email: user.email,
      name: user.name,
      mfaRequired: user.mfaEnabled,
      token, // Return token for the complete step
    });

  } catch (error: any) {
    console.error('Magic link verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/magic-link/verify
 * Complete the magic link authentication (with optional MFA)
 */
export async function POST(request: NextRequest) {
  try {
    const { token, mfaCode } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link' },
        { status: 400 }
      );
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.json(
        { success: false, error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > magicLink.expires) {
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: magicLink.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!user || !user.isActive || user.isSuspended) {
      return NextResponse.json(
        { success: false, error: 'Account not found or inactive' },
        { status: 400 }
      );
    }

    // If MFA is enabled, verify the code
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return NextResponse.json(
          { success: false, error: 'MFA code is required', mfaRequired: true },
          { status: 400 }
        );
      }

      // Verify TOTP code
      const { authenticator } = await import('otplib');
      
      if (!user.mfaSecret) {
        return NextResponse.json(
          { success: false, error: 'MFA not properly configured' },
          { status: 400 }
        );
      }

      const isValidCode = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid MFA code', mfaRequired: true },
          { status: 400 }
        );
      }
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { token },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    // Update user's last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    console.log('Magic link login successful for:', user.email);

    // Return user data for NextAuth to create session
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
      },
    });

  } catch (error: any) {
    console.error('Magic link complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete authentication' },
      { status: 500 }
    );
  }
}
