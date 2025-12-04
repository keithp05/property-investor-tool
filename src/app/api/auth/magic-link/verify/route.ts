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

    let magicLink: any;
    try {
      magicLink = await (prisma as any).magicLink.findUnique({
        where: { token },
      });
    } catch (dbError: any) {
      console.error('MagicLink database error:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Magic link feature is not yet available' },
        { status: 503 }
      );
    }

    if (!magicLink) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link' },
        { status: 400 }
      );
    }

    if (magicLink.used) {
      return NextResponse.json(
        { success: false, error: 'This link has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(magicLink.expires)) {
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user - try with MFA columns first
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { email: magicLink.email },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isSuspended: true,
          mfaEnabled: true,
        },
      });
    } catch (e) {
      // Fall back to basic columns
      user = await prisma.user.findUnique({
        where: { email: magicLink.email },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 400 }
      );
    }

    // Check active status if columns exist
    if (user.isActive === false || user.isSuspended === true) {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      name: user.name,
      mfaRequired: user.mfaEnabled || false,
      token,
    });

  } catch (error: any) {
    console.error('Magic link verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify link', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/magic-link/verify
 * Complete the magic link authentication
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

    let magicLink: any;
    try {
      magicLink = await (prisma as any).magicLink.findUnique({
        where: { token },
      });
    } catch (dbError: any) {
      console.error('MagicLink database error:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Magic link feature is not yet available' },
        { status: 503 }
      );
    }

    if (!magicLink) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link' },
        { status: 400 }
      );
    }

    if (magicLink.used) {
      return NextResponse.json(
        { success: false, error: 'This link has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(magicLink.expires)) {
      return NextResponse.json(
        { success: false, error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user - try with all columns
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { email: magicLink.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          isActive: true,
          isSuspended: true,
          mfaEnabled: true,
          mfaSecret: true,
        },
      });
    } catch (e) {
      // Fall back to basic columns
      user = await prisma.user.findUnique({
        where: { email: magicLink.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          subscriptionStatus: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 400 }
      );
    }

    // Check active status if columns exist
    if (user.isActive === false || user.isSuspended === true) {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 400 }
      );
    }

    // If MFA is enabled, verify the code
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaCode) {
        return NextResponse.json(
          { success: false, error: 'MFA code is required', mfaRequired: true },
          { status: 400 }
        );
      }

      // Verify TOTP code
      const { authenticator } = await import('otplib');
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
    await (prisma as any).magicLink.update({
      where: { token },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    // Update user's last login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });
    } catch (e) {
      console.log('Could not update login stats (columns may not exist)');
    }

    console.log('Magic link login successful for:', user.email);

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
      { success: false, error: 'Failed to complete authentication', debug: error.message },
      { status: 500 }
    );
  }
}
